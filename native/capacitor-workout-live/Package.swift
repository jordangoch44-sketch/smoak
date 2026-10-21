// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorWorkoutLive",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorWorkoutLive",
            targets: ["WorkoutLiveActivityPlugin"]),
        .library(
            name: "WorkoutLiveAttributes",
            targets: ["WorkoutLiveAttributes"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "WorkoutLiveAttributes",
            path: "ios/Sources/WorkoutLiveAttributes",
            linkerSettings: [
                .linkedFramework("ActivityKit")
            ]
        ),
        .target(
            name: "WorkoutLiveActivityPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .target(name: "WorkoutLiveAttributes")
            ],
            path: "ios/Sources/WorkoutLiveActivityPlugin",
            linkerSettings: [
                .linkedFramework("ActivityKit")
            ]
        )
    ]
)
