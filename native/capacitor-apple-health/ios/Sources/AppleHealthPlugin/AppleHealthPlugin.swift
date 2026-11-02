import Foundation
import Capacitor
import HealthKit

@objc(AppleHealthPlugin)
public class AppleHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleHealthPlugin"
    public let jsName = "AppleHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryWorkouts", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()
    private let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    /// Workouts and the active calories on them.
    /// HealthKit only presents the sheet from the main thread. A background
    /// call, or a delayed Swift task, never shows it and never calls back,
    /// so the connecting screen spins forever.
    /// Workouts are included in the write set so the sheet has something to
    /// show. SMOAC still does not save anything into Apple Health.
    @objc func requestAccess(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["ok": false, "prompted": false])
            return
        }
        call.keepAlive = true
        let ask = { [weak self] in
            guard let self else {
                DispatchQueue.main.async {
                    call.keepAlive = false
                    call.reject("Couldn’t open Apple Health.")
                }
                return
            }
            self.store.getRequestStatusForAuthorization(toShare: Self.shareTypes, read: Self.readTypes) { status, error in
                DispatchQueue.main.async {
                    if let error {
                        self.finish(call, ok: false, prompted: false, message: error.localizedDescription)
                        return
                    }
                    if status == .unnecessary {
                        self.finish(call, ok: true, prompted: false, message: nil)
                        return
                    }
                    self.store.requestAuthorization(toShare: Self.shareTypes, read: Self.readTypes) { success, authError in
                        if let authError {
                            self.finish(call, ok: false, prompted: true, message: authError.localizedDescription)
                            return
                        }
                        self.finish(
                            call,
                            ok: success,
                            prompted: true,
                            message: success ? nil : "The Apple Health permission screen was closed."
                        )
                    }
                }
            }
        }
        if Thread.isMainThread {
            ask()
        } else {
            DispatchQueue.main.async(execute: ask)
        }
    }

    private func finish(_ call: CAPPluginCall, ok: Bool, prompted: Bool, message: String?) {
        DispatchQueue.main.async {
            call.keepAlive = false
            if let message {
                call.reject(message)
                return
            }
            call.resolve(["ok": ok, "prompted": prompted])
        }
    }

    /// Completed workouts whose start falls in [start, end), in milliseconds.
    @objc func queryWorkouts(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["workouts": []])
            return
        }
        guard let startMs = call.getDouble("start"), let endMs = call.getDouble("end"), endMs > startMs else {
            call.reject("Missing workout range")
            return
        }
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = Date(timeIntervalSince1970: endMs / 1000)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: 400,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let workouts = (samples as? [HKWorkout]) ?? []
            call.resolve(["workouts": workouts.map { self.payload(for: $0) }])
        }
        store.execute(query)
    }

    /// Needed so Apple presents the sheet. Nothing is written.
    private static var shareTypes: Set<HKSampleType> {
        [HKObjectType.workoutType()]
    }

    private static var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]
        if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(energy)
        }
        return types
    }

    private func payload(for workout: HKWorkout) -> [String: Any] {
        let activity = activityParts(workout.workoutActivityType)
        var item: [String: Any] = [
            "id": workout.uuid.uuidString,
            "activity": activity.0,
            "activityLabel": activity.1,
            "start": iso.string(from: workout.startDate),
            "end": iso.string(from: workout.endDate),
            "durationSeconds": workout.duration,
            "source": sourceKind(workout)
        ]
        if let calories = activeCalories(workout) {
            item["activeCalories"] = calories
        }
        return item
    }

    /// Active energy on the workout itself. Not the day's Move ring.
    private func activeCalories(_ workout: HKWorkout) -> Double? {
        let unit = HKUnit.kilocalorie()
        if #available(iOS 16.0, *) {
            if let energy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
               let sum = workout.statistics(for: energy)?.sumQuantity() {
                let value = sum.doubleValue(for: unit)
                if value.isFinite, value > 0 {
                    return value
                }
            }
        }
        if let total = workout.totalEnergyBurned {
            let value = total.doubleValue(for: unit)
            if value.isFinite, value > 0 {
                return value
            }
        }
        return nil
    }

    private func sourceKind(_ workout: HKWorkout) -> String {
        let revision = workout.sourceRevision
        let blob = "\(revision.source.name) \(revision.productType ?? "") \(revision.source.bundleIdentifier)"
        if blob.range(of: "watch", options: .caseInsensitive) != nil {
            return "watch"
        }
        if revision.source.bundleIdentifier.hasPrefix("com.apple.") {
            return "iphone"
        }
        return "other"
    }

    private func activityParts(_ type: HKWorkoutActivityType) -> (String, String) {
        switch type {
        case .traditionalStrengthTraining, .functionalStrengthTraining:
            return ("strength", "Strength Training")
        case .running:
            return ("running", "Running")
        case .cycling:
            return ("cycling", "Cycling")
        case .walking:
            return ("walking", "Walking")
        case .hiking:
            return ("hiking", "Hiking")
        case .swimming:
            return ("swimming", "Swimming")
        case .highIntensityIntervalTraining:
            return ("hiit", "HIIT")
        case .yoga:
            return ("yoga", "Yoga")
        case .elliptical:
            return ("elliptical", "Elliptical")
        case .rowing:
            return ("rowing", "Rowing")
        case .stairClimbing, .stairs:
            return ("stairs", "Stair Climbing")
        case .coreTraining:
            return ("core", "Core Training")
        case .flexibility:
            return ("flexibility", "Flexibility")
        case .dance:
            return ("dance", "Dance")
        case .mixedMetabolicCardioTraining:
            return ("mixed-cardio", "Mixed Cardio")
        case .preparationAndRecovery:
            return ("recovery", "Recovery")
        default:
            if #available(iOS 16.0, *), type == .mixedCardio {
                return ("mixed-cardio", "Mixed Cardio")
            }
            return ("other", "Workout")
        }
    }
}
