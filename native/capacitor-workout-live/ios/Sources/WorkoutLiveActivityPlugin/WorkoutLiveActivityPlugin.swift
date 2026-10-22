import Foundation
import Capacitor
import os
import UIKit

#if canImport(ActivityKit)
import ActivityKit
import WorkoutLiveAttributes
#endif

private let liveLog = Logger(subsystem: "com.smoac.app", category: "WorkoutLiveActivity")

@objc(WorkoutLiveActivityPlugin)
public class WorkoutLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WorkoutLiveActivityPlugin"
    public let jsName = "WorkoutLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func start(_ call: CAPPluginCall) {
        let exerciseName = (call.getString("exerciseName") ?? "Workout")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let setLabel = (call.getString("setLabel") ?? "Set 1")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let weightLabel = call.getString("weightLabel") ?? "—"
        let repsLabel = call.getString("repsLabel") ?? "—"
        let setsLabel = call.getString("setsLabel") ?? "1 set"
        let imageUrl = call.getString("imageUrl") ?? ""
        let thumbSlug = (call.getString("thumbSlug") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let setNumber = call.getInt("setNumber") ?? 1
        let setCount = max(call.getInt("setCount") ?? 1, 1)
        let progress = min(max(call.getDouble("progress") ?? 0, 0), 1)
        let startedMs = call.getDouble("startedAt") ?? Date().timeIntervalSince1970 * 1000
        let startedAt = Date(timeIntervalSince1970: startedMs / 1000)
        Task { @MainActor in
            let ok = await WorkoutLiveCenter.shared.sync(
                exerciseName: exerciseName.isEmpty ? "Workout" : exerciseName,
                setLabel: setLabel.isEmpty ? "Set 1" : setLabel,
                setNumber: max(setNumber, 1),
                setCount: setCount,
                weightLabel: weightLabel,
                repsLabel: repsLabel,
                setsLabel: setsLabel,
                progress: progress,
                imageUrl: imageUrl,
                thumbSlug: thumbSlug,
                startedAt: startedAt
            )
            call.resolve(["ok": ok])
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        Task { @MainActor in
            await WorkoutLiveCenter.shared.end()
            call.resolve(["ok": true])
        }
    }
}

@MainActor
private final class WorkoutLiveCenter {
    static let shared = WorkoutLiveCenter()

    func sync(
        exerciseName: String,
        setLabel: String,
        setNumber: Int,
        setCount: Int,
        weightLabel: String,
        repsLabel: String,
        setsLabel: String,
        progress: Double,
        imageUrl: String,
        thumbSlug: String,
        startedAt: Date
    ) async -> Bool {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            return await WorkoutLiveSession.shared.sync(
                exerciseName: exerciseName,
                setLabel: setLabel,
                setNumber: setNumber,
                setCount: setCount,
                weightLabel: weightLabel,
                repsLabel: repsLabel,
                setsLabel: setsLabel,
                progress: progress,
                imageUrl: imageUrl,
                thumbSlug: thumbSlug,
                startedAt: startedAt
            )
        }
        #endif
        return false
    }

    func end() async {
        #if canImport(ActivityKit)
        if #available(iOS 16.2, *) {
            await WorkoutLiveSession.shared.end()
        }
        #endif
    }
}

#if canImport(ActivityKit)
@available(iOS 16.2, *)
@MainActor
private final class WorkoutLiveSession {
    static let shared = WorkoutLiveSession()
    private var activity: Activity<WorkoutActivityAttributes>?
    private var cachedImageUrl = ""

    func sync(
        exerciseName: String,
        setLabel: String,
        setNumber: Int,
        setCount: Int,
        weightLabel: String,
        repsLabel: String,
        setsLabel: String,
        progress: Double,
        imageUrl: String,
        thumbSlug: String,
        startedAt: Date
    ) async -> Bool {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            liveLog.error("Live Activities are off for SMOAC")
            return false
        }
        let slug = String(thumbSlug.prefix(80))
        let state = WorkoutActivityAttributes.ContentState(
            exerciseName: String(exerciseName.prefix(48)),
            setLabel: String(setLabel.prefix(32)),
            setNumber: setNumber,
            setCount: setCount,
            weightLabel: String(weightLabel.prefix(24)),
            repsLabel: String(repsLabel.prefix(24)),
            setsLabel: String(setsLabel.prefix(24)),
            progress: progress,
            hasThumb: false,
            thumbSlug: slug
        )
        let started = await publish(state: state, startedAt: startedAt)
        guard started else { return false }
        let hasThumb = await storeThumb(imageUrl)
        guard hasThumb else { return true }
        var withPhoto = state
        withPhoto.hasThumb = true
        return await publish(state: withPhoto, startedAt: startedAt)
    }

    /// An ended or dismissed card still accepts updates and reports success, but the lock screen stays blank.
    private func runningActivity() -> Activity<WorkoutActivityAttributes>? {
        if let activity, activity.activityState == .active {
            return activity
        }
        return Activity<WorkoutActivityAttributes>.activities.first { $0.activityState == .active }
    }

    private func publish(
        state: WorkoutActivityAttributes.ContentState,
        startedAt: Date
    ) async -> Bool {
        if let existing = runningActivity(),
           abs(existing.attributes.startedAt.timeIntervalSince(startedAt)) < 1 {
            activity = existing
            await existing.update(ActivityContent(state: state, staleDate: nil))
            return true
        }
        for existing in Activity<WorkoutActivityAttributes>.activities {
            let finalState = existing.content.state
            await existing.end(
                ActivityContent(state: finalState, staleDate: Date()),
                dismissalPolicy: .immediate
            )
        }
        activity = nil
        do {
            let requested = try Activity.request(
                attributes: WorkoutActivityAttributes(startedAt: startedAt),
                content: ActivityContent(state: state, staleDate: nil),
                pushType: nil
            )
            activity = requested
            NSLog(
                "SMOAC live activity started %@ %@",
                requested.id,
                String(describing: requested.activityState)
            )
            return requested.activityState != .ended && requested.activityState != .dismissed
        } catch {
            activity = nil
            NSLog("SMOAC live activity failed %@", error.localizedDescription)
            liveLog.error("Live Activity request failed: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    func end() async {
        for existing in Activity<WorkoutActivityAttributes>.activities {
            // nil content leaves the compact island up, frozen at the timer's
            // upper bound (18:00:00). Hand iOS the current state and drop it now.
            let finalState = existing.content.state
            await existing.end(
                ActivityContent(state: finalState, staleDate: Date()),
                dismissalPolicy: .immediate
            )
        }
        activity = nil
        cachedImageUrl = ""
    }

    private func storeThumb(_ imageUrl: String) async -> Bool {
        guard let dest = WorkoutLiveFiles.thumbURL else { return false }
        if imageUrl.isEmpty {
            cachedImageUrl = ""
            try? FileManager.default.removeItem(at: dest)
            return false
        }
        if imageUrl == cachedImageUrl, FileManager.default.fileExists(atPath: dest.path) {
            return true
        }
        let data: Data?
        if imageUrl.hasPrefix("data:") {
            guard let comma = imageUrl.firstIndex(of: ",") else { return false }
            let payload = String(imageUrl[imageUrl.index(after: comma)...])
            data = Data(base64Encoded: payload)
        } else if let url = URL(string: imageUrl) {
            var request = URLRequest(url: url)
            request.timeoutInterval = 4
            data = try? await URLSession.shared.data(for: request).0
        } else {
            data = nil
        }
        guard let data, let image = UIImage(data: data), let jpeg = jpegThumb(image) else { return false }
        do {
            try jpeg.write(to: dest, options: .atomic)
            cachedImageUrl = imageUrl
            return true
        } catch {
            return false
        }
    }

    private func jpegThumb(_ image: UIImage) -> Data? {
        let side: CGFloat = 128
        let scale = min(side / max(image.size.width, 1), side / max(image.size.height, 1), 1)
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let scaled = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        return scaled.jpegData(compressionQuality: 0.72)
    }
}
#endif
