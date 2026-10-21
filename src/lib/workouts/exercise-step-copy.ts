import { formatExerciseName } from "@/data/workout-exercise-library";

/** Drop the "Step:1" prefix ExerciseDB puts on each line. */
export function cleanExerciseSteps(values: readonly unknown[]): string[] {
  const steps: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value
      .replace(/^step:\s*\d+\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || steps.includes(text)) continue;
    steps.push(text.slice(0, 280));
    if (steps.length === 8) break;
  }
  return steps;
}

function line(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function setup(name: string): string {
  const oneSide = /\b(single|one)[ -]?(arm|leg|hand)\b|\bunilateral\b/.test(name);
  if (name.includes("dumbbell")) {
    return oneSide ? "Hold a dumbbell in the working hand." : "Hold a dumbbell in each hand.";
  }
  if (name.includes("kettlebell")) {
    return oneSide ? "Hold a kettlebell in the working hand." : "Hold the kettlebell with both hands.";
  }
  if (name.includes("barbell") || name.includes("ez-bar") || name.includes("ez bar")) {
    return "Take hold of the bar with both hands.";
  }
  if (name.includes("cable") || /\brope\b/.test(name)) return "Set the cable and take hold of the handle.";
  if (name.includes("band")) return "Anchor the band and take hold of it.";
  if (name.includes("smith")) return "Set the Smith bar at the height you need and take hold of it.";
  if (name.includes("machine") || name.includes("sled") || name.includes("lever")) {
    return "Adjust the machine, sit or stand in it, and take hold of the handles.";
  }
  if (name.includes("ball")) return "Set the ball where you can stay balanced.";
  return "Get into a stable starting position you can repeat.";
}

function pattern(name: string, title: string): string[] {
  if (name.includes("otis")) {
    return [
      "Lie back on a bench as if the bar had just touched your chest at the bottom of a press.",
      "Plant your feet and brace your trunk.",
      "Press the bar up until your arms are straight.",
      "Lower it to your chest under control.",
      "Pause there without bouncing the bar off your chest.",
      "Press again from that bottom position.",
    ];
  }
  if (name.includes("planche")) {
    return [
      "Place your hands on the floor about shoulder width, fingers forward.",
      name.includes("frog")
        ? "Lean your shoulders ahead of your wrists and tuck your knees in toward your chest."
        : "Lean your shoulders slightly ahead of your wrists and brace your trunk.",
      "Shift your weight forward until your feet lighten, keeping your arms straight.",
      "Hold a line from your shoulders through your hips.",
      "Keep breathing instead of holding your breath.",
      "Set your feet down with control and reset your hands.",
    ];
  }
  if (
    name.includes("stretch") &&
    !/\b(row|press|curl|pulldown|pushdown|squat|lunge)\b/.test(name)
  ) {
    return [
      `Move into ${title} only until you feel a gentle pull.`,
      "Support the joint you are stretching and let the rest of your body relax.",
      "Breathe slowly and hold the position.",
      "Ease a little deeper only if the stretch stays comfortable.",
      "Do not bounce or pull into a sharp pain.",
      "Come out slowly, then switch sides when the exercise calls for it.",
    ];
  }
  if (/\b(run|jog|sprint)\b/.test(name)) {
    return [
      "Start tall, with a light lean from the ankles and your eyes forward.",
      "Land quietly under your hips, not out in front of you.",
      "Keep your arms swinging from the shoulders, elbows soft.",
      "Match your breathing to your pace.",
      "Shorten the stride if your form starts to bounce.",
      "Slow to a walk when the interval ends instead of stopping dead.",
    ];
  }
  if (name.includes("shrug")) {
    return [
      setup(name),
      "Stand tall with your arms straight and your shoulders relaxed.",
      "Lift your shoulders straight up toward your ears.",
      "Pause briefly at the top without rolling them forward.",
      "Lower your shoulders all the way back down.",
      "Reset your neck and repeat.",
    ];
  }
  if (name.includes("wrist")) {
    return [
      setup(name),
      "Rest your forearms so only your wrists are free to move.",
      "Curl your wrists through a comfortable range.",
      "Keep the forearms still and the grip secure.",
      "Lower back to the start under control.",
      "Repeat, and switch grip or side when the exercise calls for it.",
    ];
  }
  if (name.includes("calf")) {
    return [
      "Stand or sit in the setup for the raise, with the balls of your feet on a stable surface.",
      setup(name),
      "Let your heels sink until you feel a light stretch in the calves.",
      "Rise up onto the balls of your feet as high as you can without rocking.",
      "Pause at the top, then lower slowly.",
      "Keep the knees quiet and repeat.",
    ];
  }
  if (name.includes("pushdown") || (name.includes("kickback") && name.includes("tricep"))) {
    return [
      setup(name),
      "Pin your upper arms to your sides and set your shoulders down.",
      "Straighten your elbows to press the handle or weight away.",
      "Stop short of locking so hard that the shoulders roll forward.",
      "Bend the elbows to return, keeping the upper arms still.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("sit-up") || name.includes("sit up") || name.includes("crunch")) {
    return [
      "Lie on your back with your knees bent and your feet planted.",
      name.includes("prisoner")
        ? "Rest your hands at your temples without pulling on your neck."
        : "Cross your arms or place your hands where the exercise asks.",
      "Brace lightly and curl your ribs toward your hips.",
      name.includes("half") || name.includes("shallow")
        ? "Lift only until your shoulder blades start to leave the floor."
        : "Lift your shoulder blades off the floor without throwing the head forward.",
      "Keep your neck relaxed and your lower back quiet.",
      "Lower with control and repeat.",
    ];
  }
  if (name.includes("knee raise") || name.includes("leg raise") || name.includes("hanging")) {
    return [
      name.includes("hanging")
        ? "Hang from a bar with a grip you can hold, shoulders set down."
        : "Lie back or support yourself in the starting position.",
      "Brace your trunk so your lower back does not arch.",
      name.includes("knee")
        ? "Draw your knees up in front of you."
        : "Raise your legs through a range you can control.",
      "Pause briefly without swinging.",
      "Lower slowly until the shoulders stay packed.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("squat") || name.includes("overhead reach")) {
    return [
      name.includes("wide")
        ? "Stand with your feet wider than your shoulders."
        : "Stand and set your feet about shoulder width.",
      setup(name),
      "Brace your trunk and keep your chest up.",
      name.includes("overhead")
        ? "Squat down, then stand and reach overhead as you rise."
        : "Sit your hips back and bend your knees, keeping your heels down.",
      name.includes("twist")
        ? "Turn your chest toward the reaching arm, then return to the squat."
        : "Go only as deep as you can control without your knees caving in.",
      "Drive through your feet to stand, then reset before the next rep.",
    ];
  }
  if (name.includes("lunge") || name.includes("split squat") || name.includes("step-up") || name.includes("step up")) {
    return [
      "Stand tall and set your feet so you can balance.",
      setup(name),
      name.includes("reverse") || name.includes("rear")
        ? "Step one foot backward and lower the back knee toward the floor."
        : "Step forward or up and lower until both knees are bent.",
      "Keep the front foot planted and the front knee tracking over the toes.",
      "Push through the front foot to return to standing.",
      "Switch legs as the set calls for it.",
    ];
  }
  if (name.includes("deadlift") || name.includes("good morning") || name.includes("swing") || name.includes("romanian")) {
    return [
      "Stand with the weight close to you and your feet about hip width.",
      setup(name),
      "Brace, then push your hips back while keeping a long spine.",
      "Lower only as far as your hips can travel without rounding.",
      "Keep the bar or weights close to your legs.",
      "Drive the hips forward to stand tall, then reset.",
    ];
  }
  if (name.includes("curl")) {
    return [
      setup(name),
      "Pin your upper arms in place and set your shoulders down.",
      "Curl the weight toward you by bending only the elbows.",
      "Keep your wrists steady and your trunk still.",
      "Lower along the same path until the elbows are nearly straight.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("row") || name.includes("face pull")) {
    return [
      setup(name),
      "Set your torso so you are not using a swing to start the pull.",
      "Draw your elbows back and bring the handle toward your torso.",
      "Keep both shoulders level and your chest up.",
      "Pause briefly when the shoulder blades come together.",
      "Reach back to the start without letting the torso lurch.",
    ];
  }
  if (name.includes("pulldown") || name.includes("pull-up") || name.includes("pull up") || name.includes("chin-up") || name.includes("chin up")) {
    return [
      name.includes("pull-up") || name.includes("chin")
        ? "Hang from the bar with a grip you can hold and your shoulders set down."
        : "Sit at the machine, secure your legs, and take hold of the bar.",
      "Brace before you pull.",
      "Pull your chest toward the bar by driving your elbows down.",
      "Stop when the upper arms are near your sides, without craning the neck.",
      "Lower until the arms are long and the shoulders stay packed.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("fly") || name.includes("crossover") || name.includes("pec deck")) {
    return [
      setup(name),
      "Keep a soft bend in the elbows and set the shoulders.",
      "Sweep your arms together in a wide arc.",
      "Keep that elbow angle nearly unchanged.",
      "Squeeze at the midline without banging the handles together.",
      "Open the arms back along the same arc.",
    ];
  }
  if (name.includes("extension") || name.includes("skull")) {
    return [
      setup(name),
      "Point your elbows in the direction the exercise asks and keep them from flaring.",
      "Straighten your elbows to extend the weight.",
      "Move only at the elbows, not by arching your back.",
      "Bend the elbows to return to the start.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("raise") && !name.includes("leg")) {
    return [
      setup(name),
      "Set your shoulders down before the arms move.",
      "Lift the weights along the path of the raise, stopping near shoulder height.",
      "Keep a soft elbow and do not swing from the hips.",
      "Lower slowly to the start.",
      "Reset and repeat.",
    ];
  }
  if (
    name.includes("press") ||
    name.includes("bench") ||
    name.includes("push-up") ||
    name.includes("push up") ||
    name.includes("dip")
  ) {
    return [
      name.includes("push-up") || name.includes("push up")
        ? "Set your hands under your shoulders and your body in one line."
        : name.includes("dip")
          ? "Support yourself on the bars or bench with your arms straight."
          : "Set your back and feet against a stable support.",
      setup(name),
      "Brace your trunk and stack your wrists over your forearms.",
      "Press away until your arms are straight without letting the shoulders shrug up.",
      "Lower under control to the start of the rep.",
      "Reset your brace and press again.",
    ];
  }
  if (name.includes("bridge") || name.includes("thrust") || name.includes("hip")) {
    return [
      "Set your upper back and feet so your knees can bend comfortably.",
      setup(name),
      "Brace, then drive your hips up until your body is in a line from shoulders to knees.",
      "Squeeze the glutes at the top without arching the lower back.",
      "Lower the hips with control.",
      "Reset and repeat.",
    ];
  }
  if (name.includes("plank") || name.includes("dead bug") || name.includes("pallof") || name.includes("rollout")) {
    return [
      "Set your hands or elbows and your feet so your body can form one line.",
      "Brace your trunk and tuck the pelvis slightly.",
      "Hold or move while the hips stay level and the lower back stays quiet.",
      "Keep breathing instead of holding your breath.",
      "Stop the set if the hips sag or pike.",
      "Rest, reset the brace, and go again.",
    ];
  }
  return [
    `Set up for ${title}.`,
    setup(name),
    "Brace your trunk and set your shoulders before the first rep.",
    `Move through ${title} in a range you can control.`,
    "Pause briefly where the working muscles are under the most tension.",
    "Return to the start without bouncing, then reset and repeat.",
  ];
}

/** General how-to used when ExerciseDB has no steps for this name. Always at least four lines. */
export function generateExerciseSteps(name: string): string[] {
  const title = formatExerciseName(name) || "This exercise";
  const steps = pattern(title.toLowerCase(), title).map(line).filter(Boolean);
  if (steps.length >= 4) return steps.slice(0, 8);
  return [
    `Set up for ${title}.`,
    "Brace your trunk before you move.",
    "Move through a range you can control.",
    "Return to the start and repeat.",
  ];
}
