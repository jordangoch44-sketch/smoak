import Foundation

public enum WorkoutLiveFiles {
    public static let appGroupId = "group.com.smoac.app"
    public static let thumbFilename = "live-exercise.jpg"
    public static let clockNotification = "com.smoac.app.workout-clock"

    public static var thumbURL: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
            .appendingPathComponent(thumbFilename)
    }
}

#if canImport(ActivityKit)
import ActivityKit

/// One definition, linked by both the app and the lock-screen widget.
/// A second copy in another module never appears on the lock screen.
@available(iOS 16.2, *)
public struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var exerciseName: String
        public var setLabel: String
        public var setNumber: Int
        public var setCount: Int
        public var weightLabel: String
        public var repsLabel: String
        public var setsLabel: String
        public var progress: Double
        public var hasThumb: Bool
        /// Library still filename, without the extension. Empty for a custom photo. */
        public var thumbSlug: String
        /// Closed pauses, in seconds. The running clock starts this far after `startedAt`.
        public var pausedSeconds: Double
        /// Unix seconds when the open pause began. Zero while the clock is running.
        public var pausedSince: Double
        public var paused: Bool
        /// Frozen training time, in seconds, shown while paused.
        public var elapsedSeconds: Int

        private enum CodingKeys: String, CodingKey {
            case exerciseName, setLabel, setNumber, setCount
            case weightLabel, repsLabel, setsLabel, progress, hasThumb, thumbSlug
            case pausedSeconds, pausedSince, paused, elapsedSeconds
        }

        public init(
            exerciseName: String,
            setLabel: String,
            setNumber: Int,
            setCount: Int,
            weightLabel: String,
            repsLabel: String,
            setsLabel: String,
            progress: Double,
            hasThumb: Bool,
            thumbSlug: String,
            pausedSeconds: Double = 0,
            pausedSince: Double = 0,
            paused: Bool = false,
            elapsedSeconds: Int = 0
        ) {
            self.exerciseName = exerciseName
            self.setLabel = setLabel
            self.setNumber = setNumber
            self.setCount = setCount
            self.weightLabel = weightLabel
            self.repsLabel = repsLabel
            self.setsLabel = setsLabel
            self.progress = progress
            self.hasThumb = hasThumb
            self.thumbSlug = thumbSlug
            self.pausedSeconds = pausedSeconds
            self.pausedSince = pausedSince
            self.paused = paused
            self.elapsedSeconds = elapsedSeconds
        }

        public init(from decoder: Decoder) throws {
            let values = try decoder.container(keyedBy: CodingKeys.self)
            exerciseName = try values.decodeIfPresent(String.self, forKey: .exerciseName) ?? "Workout"
            setNumber = try values.decodeIfPresent(Int.self, forKey: .setNumber) ?? 1
            setCount = try values.decodeIfPresent(Int.self, forKey: .setCount) ?? 1
            setLabel = try values.decodeIfPresent(String.self, forKey: .setLabel) ?? "Set \(setNumber) of \(setCount)"
            weightLabel = try values.decodeIfPresent(String.self, forKey: .weightLabel) ?? "—"
            repsLabel = try values.decodeIfPresent(String.self, forKey: .repsLabel) ?? "—"
            setsLabel = try values.decodeIfPresent(String.self, forKey: .setsLabel) ?? "1 set"
            progress = try values.decodeIfPresent(Double.self, forKey: .progress) ?? 0
            hasThumb = try values.decodeIfPresent(Bool.self, forKey: .hasThumb) ?? false
            thumbSlug = try values.decodeIfPresent(String.self, forKey: .thumbSlug) ?? ""
            pausedSeconds = try values.decodeIfPresent(Double.self, forKey: .pausedSeconds) ?? 0
            pausedSince = try values.decodeIfPresent(Double.self, forKey: .pausedSince) ?? 0
            paused = try values.decodeIfPresent(Bool.self, forKey: .paused) ?? false
            elapsedSeconds = try values.decodeIfPresent(Int.self, forKey: .elapsedSeconds) ?? 0
        }

        public func encode(to encoder: Encoder) throws {
            var values = encoder.container(keyedBy: CodingKeys.self)
            try values.encode(exerciseName, forKey: .exerciseName)
            try values.encode(setLabel, forKey: .setLabel)
            try values.encode(setNumber, forKey: .setNumber)
            try values.encode(setCount, forKey: .setCount)
            try values.encode(weightLabel, forKey: .weightLabel)
            try values.encode(repsLabel, forKey: .repsLabel)
            try values.encode(setsLabel, forKey: .setsLabel)
            try values.encode(progress, forKey: .progress)
            try values.encode(hasThumb, forKey: .hasThumb)
            try values.encode(thumbSlug, forKey: .thumbSlug)
            try values.encode(pausedSeconds, forKey: .pausedSeconds)
            try values.encode(pausedSince, forKey: .pausedSince)
            try values.encode(paused, forKey: .paused)
            try values.encode(elapsedSeconds, forKey: .elapsedSeconds)
        }
    }

    public var startedAt: Date

    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}

/// Pause and resume shared by the lock-screen button and the app.
public struct WorkoutLiveClockCommand: Codable {
    /// Unix milliseconds of the workout start.
    public var startedAt: Double
    public var paused: Bool
    /// Closed pauses, in seconds.
    public var pausedSeconds: Double
    /// Unix milliseconds when the open pause began.
    public var pausedSince: Double?
    public var elapsedSeconds: Int
}

public enum WorkoutLiveClock {
    private static let lock = NSLock()
    private static let commandKey = "workout-live-clock-command"
    private static let maxPausedSeconds = 7 * 24 * 60 * 60.0

    public static func write(_ command: WorkoutLiveClockCommand) {
        guard let data = try? JSONEncoder().encode(command),
              let defaults = UserDefaults(suiteName: WorkoutLiveFiles.appGroupId) else { return }
        lock.lock()
        defaults.set(data, forKey: commandKey)
        lock.unlock()
        post()
    }

    public static func take() -> WorkoutLiveClockCommand? {
        guard let defaults = UserDefaults(suiteName: WorkoutLiveFiles.appGroupId) else { return nil }
        lock.lock()
        let data = defaults.data(forKey: commandKey)
        if data != nil {
            defaults.removeObject(forKey: commandKey)
        }
        lock.unlock()
        guard let data else { return nil }
        return try? JSONDecoder().decode(WorkoutLiveClockCommand.self, from: data)
    }

    public static func post() {
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(WorkoutLiveFiles.clockNotification as CFString),
            nil,
            nil,
            true
        )
    }

    /// The system timer cannot stop, so a pause freezes the number and a resume moves the start forward.
    @available(iOS 16.2, *)
    @MainActor
    public static func toggle() async {
        guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: { $0.activityState == .active }) else {
            return
        }
        var state = activity.content.state
        let started = activity.attributes.startedAt
        let now = Date()
        if state.paused {
            let since = state.pausedSince > 0 ? Date(timeIntervalSince1970: state.pausedSince) : now
            state.pausedSeconds = min(max(state.pausedSeconds, 0) + max(0, now.timeIntervalSince(since)), maxPausedSeconds)
            state.paused = false
            state.pausedSince = 0
        } else {
            state.paused = true
            state.pausedSince = now.timeIntervalSince1970
        }
        let elapsed = max(0, now.timeIntervalSince(started) - max(state.pausedSeconds, 0))
        state.elapsedSeconds = Int(elapsed.rounded(.down))
        await activity.update(ActivityContent(state: state, staleDate: nil))
        write(
            WorkoutLiveClockCommand(
                startedAt: started.timeIntervalSince1970 * 1000,
                paused: state.paused,
                pausedSeconds: state.pausedSeconds,
                pausedSince: state.paused && state.pausedSince > 0 ? state.pausedSince * 1000 : nil,
                elapsedSeconds: state.elapsedSeconds
            )
        )
    }
}
#endif
