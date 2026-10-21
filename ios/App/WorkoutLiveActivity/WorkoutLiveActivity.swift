import ActivityKit
import SwiftUI
import UIKit
import WidgetKit
import WorkoutLiveAttributes

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
                    Text(context.attributes.startedAt, style: .timer)
                        .font(.title3.monospacedDigit().weight(.semibold))
                        .foregroundStyle(Color(red: 0.88, green: 0.84, blue: 1))
                        .frame(maxWidth: 96, alignment: .trailing)
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
                Text(context.attributes.startedAt, style: .timer)
                    .font(.caption2.monospacedDigit().weight(.semibold))
                    .foregroundStyle(Color(red: 0.88, green: 0.84, blue: 1))
                    .frame(maxWidth: 54)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional")
            }
        }
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
                    Text(context.attributes.startedAt, style: .timer)
                        .font(.system(size: 22, weight: .semibold, design: .rounded).monospacedDigit())
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("Total")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.white.opacity(0.45))
                }
                .fixedSize(horizontal: true, vertical: false)
            }
            SetProgress(fraction: context.state.progress, tint: accent)
            HStack(spacing: 0) {
                LiveStat(systemImage: "dumbbell.fill", value: context.state.weightLabel, label: "WEIGHT")
                statDivider
                LiveStat(systemImage: "arrow.triangle.2.circlepath", value: context.state.repsLabel, label: "TARGET")
                statDivider
                LiveStat(systemImage: "list.bullet", value: context.state.setsLabel, label: "TOTAL")
            }
        }
        .padding(.horizontal, 2)
        .padding(.vertical, 2)
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
