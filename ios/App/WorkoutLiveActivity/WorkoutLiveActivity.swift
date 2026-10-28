import ActivityKit
import AppIntents
import SwiftUI
import UIKit
import WidgetKit
import WorkoutLiveAttributes

@available(iOS 16.2, *)
struct ToggleWorkoutClockIntent: AppIntent {
    static var title: LocalizedStringResource = "Pause or resume workout"
    static var openAppWhenRun = false
    static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    func perform() async throws -> some IntentResult {
        await WorkoutLiveClock.toggle()
        return .result()
    }
}

@main
struct WorkoutLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        WorkoutLiveActivityWidget()
    }
}

struct WorkoutLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutLockScreen(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SMOAC")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.62))
                            .tracking(1.1)
                        Text(context.state.exerciseName)
                            .font(.headline)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 6) {
                        WorkoutClock(context: context)
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Color(red: 0.88, green: 0.84, blue: 1))
                            .frame(width: 100, alignment: .trailing)
                            .minimumScaleFactor(0.7)
                        PauseResumeMark(paused: context.state.paused)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.state.setLabel)
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.78))
                        HStack {
                            Text(context.state.weightLabel)
                            Text(context.state.repsLabel)
                            Text(context.state.setsLabel)
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Text(context.state.exerciseName)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
            } compactTrailing: {
                WorkoutClock(context: context)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color(red: 0.88, green: 0.84, blue: 1))
                    .minimumScaleFactor(0.7)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
            }
        }
    }
}

private struct WorkoutClock: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        if context.state.paused {
            Text(Self.frozen(context.state.elapsedSeconds))
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
        } else {
            ElapsedClock(
                startedAt: context.attributes.startedAt.addingTimeInterval(max(context.state.pausedSeconds, 0))
            )
        }
    }

    /// Same hour field the system timer draws, so pausing does not resize the clock.
    private static func frozen(_ seconds: Int) -> String {
        let total = max(seconds, 0)
        return String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
    }
}

private struct PauseResumeButton: View {
    let paused: Bool
    private let accent = Color(red: 0.58, green: 0.36, blue: 0.98)

    var body: some View {
        Button(intent: ToggleWorkoutClockIntent()) {
            Text(paused ? "Resume" : "Pause")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 7)
                .background(accent, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct PauseResumeMark: View {
    let paused: Bool

    var body: some View {
        Button(intent: ToggleWorkoutClockIntent()) {
            Image(systemName: paused ? "play.fill" : "pause.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color(red: 0.58, green: 0.36, blue: 0.98), in: Circle())
        }
        .buttonStyle(.plain)
    }
}

/// Elapsed time the system draws after SMOAC is suspended.
/// A plain `.timer` label turns into “1 minute” once the phone locks.
/// The range has to stay finite — an open end never renders — and it has to
/// include an hour field. Without one, an 18-hour range is measured as
/// `1080:00`. `.fixedSize()` then reserves that width, the clock overflows
/// the lock-screen card, and the duration is clipped away.
private struct ElapsedClock: View {
    let startedAt: Date

    private var interval: ClosedRange<Date> {
        startedAt...startedAt.addingTimeInterval(18 * 60 * 60)
    }

    var body: some View {
        Text(timerInterval: interval, countsDown: false, showsHours: true)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
    }
}

private struct WorkoutLockScreen: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>
    private let accent = Color(red: 0.58, green: 0.36, blue: 0.98)

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 10) {
                ExerciseThumb(slug: context.state.thumbSlug, hasCustom: context.state.hasThumb)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                        Text("SMOAC")
                            .font(.caption2.weight(.semibold))
                            .tracking(1.2)
                    }
                    .foregroundStyle(.white.opacity(0.5))
                    Text(context.state.exerciseName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(context.state.setLabel)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.62))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .trailing, spacing: 0) {
                    WorkoutClock(context: context)
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(width: 108, alignment: .trailing)
                        .minimumScaleFactor(0.75)
                    Text(context.state.paused ? "Paused" : "Total")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.white.opacity(0.45))
                }
            }
            SetProgress(fraction: context.state.progress, tint: accent)
            HStack(spacing: 0) {
                LiveStat(systemImage: "dumbbell.fill", value: context.state.weightLabel, label: "WEIGHT")
                statDivider
                LiveStat(systemImage: "arrow.triangle.2.circlepath", value: context.state.repsLabel, label: "TARGET")
                statDivider
                LiveStat(systemImage: "list.bullet", value: context.state.setsLabel, label: "TOTAL")
            }
            PauseResumeButton(paused: context.state.paused)
        }
        // The lock screen masks this card with a large corner. A couple of
        // points of padding puts the photo and the clock into that curve.
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activityBackgroundTint(Color(red: 0.07, green: 0.05, blue: 0.11))
        .activitySystemActionForegroundColor(.white)
    }

    private var statDivider: some View {
        Rectangle()
            .fill(.white.opacity(0.14))
            .frame(width: 1, height: 28)
    }
}

private struct ExerciseThumb: View {
    let slug: String
    let hasCustom: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.08))
            if let image = thumbImage() {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func thumbImage() -> UIImage? {
        if hasCustom, let url = WorkoutLiveFiles.thumbURL, let image = UIImage(contentsOfFile: url.path) {
            return image
        }
        let name = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        guard let url = Bundle.main.url(forResource: name, withExtension: "jpg", subdirectory: "thumbs") else {
            return nil
        }
        return UIImage(contentsOfFile: url.path)
    }
}

private struct SetProgress: View {
    let fraction: Double
    let tint: Color

    var body: some View {
        GeometryReader { proxy in
            let width = max(8, proxy.size.width * min(max(fraction, 0), 1))
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.12))
                Capsule().fill(tint).frame(width: width)
            }
        }
        .frame(height: 3)
    }
}

private struct LiveStat: View {
    let systemImage: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.72))
                .frame(width: 16)
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(label)
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(.white.opacity(0.42))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
    }
}
