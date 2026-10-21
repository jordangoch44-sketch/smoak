import Foundation

public enum WorkoutLiveFiles {
    public static let appGroupId = "group.com.smoac.app"
    public static let thumbFilename = "live-exercise.jpg"

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

        private enum CodingKeys: String, CodingKey {
            case exerciseName, setLabel, setNumber, setCount
            case weightLabel, repsLabel, setsLabel, progress, hasThumb, thumbSlug
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
            thumbSlug: String
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
        }
    }

    public var startedAt: Date

    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}
#endif
