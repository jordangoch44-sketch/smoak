/** ExerciseDB stills, clips, and steps. Bundled so the picker does not wait on a media request. */

export interface BundledExerciseMedia {
  imageUrl: string;
  gifUrl: string;
  instructions: readonly string[];
}

export const WORKOUT_EXERCISE_MEDIA: Readonly<Record<string, BundledExerciseMedia>> = {
  "dumbbell incline bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/1nLZyB4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/OQ1sazB.gif",
    "instructions": [
      "Angle the bench to roughly 45 degrees.",
      "Take a seat on the bench with your feet planted and your back pressed firmly against the bench.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell incline fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/mMMXgih.png",
    "gifUrl": "https://assets.exercisedb.dev/media/kGn5H0F.gif",
    "instructions": [
      "Angle an incline bench to a 45-degree angle.",
      "Take a seat on the bench with a dumbbell in each hand, palms facing each other.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "barbell bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/uc9UW4p.png",
    "gifUrl": "https://assets.exercisedb.dev/media/qU7GQpl.gif",
    "instructions": [
      "Settle onto a bench with your feet planted and your back pressed against the bench.",
      "Hold the barbell with palms facing down just beyond shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "cable standing fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/0ORnbUS.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ihYduTk.gif",
    "instructions": [
      "Connect the handles to the cables at chest height.",
      "Stand and set your feet about shoulder width, turned away from the cable machine.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "dumbbell bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/VRlOrqG.png",
    "gifUrl": "https://assets.exercisedb.dev/media/whJcEpf.gif",
    "instructions": [
      "Settle onto a bench with your feet planted and your back pressed against the bench.",
      "Take a dumbbell in each hand, with your palms facing forward and your arms extended above your chest.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "weighted straight bar dip": {
    "imageUrl": "https://assets.exercisedb.dev/media/A9tFiBI.png",
    "gifUrl": "https://assets.exercisedb.dev/media/A7v2ZQp.gif",
    "instructions": [
      "Set yourself between parallel bars with your arms straight and your body straight.",
      "Before moving, lower your body by bending your elbows until your upper arms are parallel to the ground.",
      "Set the shoulders down and keep the elbows pointed mostly behind you.",
      "Bend the elbows to lower between the supports; stop at a comfortable shoulder depth.",
      "Choose a depth that lets the shoulders stay comfortable.",
      "Press through the hands to rise, then reset the shoulders before another rep."
    ]
  },
  "barbell incline bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/KOrKLbc.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Mmiz2qI.gif",
    "instructions": [
      "Angle the bench to roughly 45 degrees.",
      "Get onto the bench with your feet planted.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "barbell decline bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/X59VT0T.png",
    "gifUrl": "https://assets.exercisedb.dev/media/DjmCUXM.gif",
    "instructions": [
      "Secure the feet on a decline bench, keeping the head below the hips.",
      "Hold the barbell with palms facing down just beyond shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "smith incline bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/3Qi2OYt.png",
    "gifUrl": "https://assets.exercisedb.dev/media/lNZk6DR.gif",
    "instructions": [
      "Set the bench to a 30-45 degree incline.",
      "Take a seat on the bench with your back flat against the pad and feet firmly on the ground.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell decline bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/IAckJPX.png",
    "gifUrl": "https://assets.exercisedb.dev/media/JMmDYHm.gif",
    "instructions": [
      "Get onto a decline bench with your feet secured and your head lower than your hips.",
      "Take a dumbbell in each hand and extend your arms straight up above your chest, palms facing forward.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/NsP1CFn.png",
    "gifUrl": "https://assets.exercisedb.dev/media/CnTNMWE.gif",
    "instructions": [
      "Settle onto a bench with a dumbbell in each hand, palms facing each other.",
      "Reach your arms straight up over your chest, with a slight bend in your elbows.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "machine chest press": {
    "imageUrl": "https://assets.exercisedb.dev/media/ZP8OEzU.png",
    "gifUrl": "https://assets.exercisedb.dev/media/eWOWYZB.gif",
    "instructions": [
      "Fit the seat to your body, then settle into the machine.",
      "Hold the handles with palms facing down and position your elbows at a 90-degree angle.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "push-up": {
    "imageUrl": "https://assets.exercisedb.dev/media/vP0igZC.png",
    "gifUrl": "https://assets.exercisedb.dev/media/DNvSePY.gif",
    "instructions": [
      "Begin in a high plank position with your hands just beyond shoulder width and your feet together.",
      "Brace your trunk and lower your body toward the ground by bending your elbows, keeping your body in a straight line.",
      "Brace the abdomen and glutes so the shoulders, hips and ankles move together.",
      "Bend your elbows to lower your chest while keeping your body in one line.",
      "Keep the head in line with the spine as the elbows bend.",
      "Press back to straight arms, keeping the body line intact."
    ]
  },
  "barbell bent over row": {
    "imageUrl": "https://assets.exercisedb.dev/media/i7sllIr.png",
    "gifUrl": "https://assets.exercisedb.dev/media/VK9KXN4.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and knees soft.",
      "Bend forward at the hips while with your spine steady and chest up.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "cable incline fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/ZPAB2LW.png",
    "gifUrl": "https://assets.exercisedb.dev/media/t56LqWc.gif",
    "instructions": [
      "Set the cable machine to a low position and attach the handles.",
      "Take a seat on an incline bench with your back against the pad and feet planted.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "cable decline fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/iaY50Cx.png",
    "gifUrl": "https://assets.exercisedb.dev/media/RC89gYI.gif",
    "instructions": [
      "Set the cable machine to a decline position.",
      "Face the away from the machine from a stable stance with feet about shoulder width.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "cable lat pulldown full range of motion": {
    "imageUrl": "https://assets.exercisedb.dev/media/3UvVPea.png",
    "gifUrl": "https://assets.exercisedb.dev/media/x1MBet7.gif",
    "instructions": [
      "Take a seat on the lat pulldown machine with your knees positioned under the pads.",
      "Hold the cable bar with palms facing down, just beyond shoulder width.",
      "Sit tall and set the shoulders before drawing the handle down.",
      "Pull the handle down by driving your elbows toward your ribs; keep your torso steady.",
      "Pull with the elbows rather than leaning far back to move the handle.",
      "Let the handle rise steadily until the arms are long, then reset the shoulders."
    ]
  },
  "weighted svend press": {
    "imageUrl": "https://assets.exercisedb.dev/media/dZ75Y6n.png",
    "gifUrl": "https://assets.exercisedb.dev/media/KyH0AOK.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold a weight plate ahead of your chest with both hands.",
      "Keep your elbows soft and your palms facing each other.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "pull-up": {
    "imageUrl": "https://assets.exercisedb.dev/media/FLIlMQK.png",
    "gifUrl": "https://assets.exercisedb.dev/media/3oYTMWX.gif",
    "instructions": [
      "Suspend yourself from a pull-up bar with your palms turned away from you and your arms straight.",
      "Brace your trunk and draw your shoulder blades toward each other.",
      "Begin from a controlled hang with the shoulders active rather than slack.",
      "Pull your elbows down and bring your upper chest toward the bar without kicking your legs.",
      "Avoid swinging the legs to clear the bar.",
      "Lower to long arms without dropping suddenly from the top."
    ]
  },
  "cable seated row": {
    "imageUrl": "https://assets.exercisedb.dev/media/nAWdpqU.png",
    "gifUrl": "https://assets.exercisedb.dev/media/DnFGrVt.gif",
    "instructions": [
      "Take a seat on the cable row machine with your feet flat on the footrests and your knees soft.",
      "Hold the handles with palms facing down, with your spine steady and your shoulders relaxed.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "cable straight arm pulldown": {
    "imageUrl": "https://assets.exercisedb.dev/media/E3JFQ3z.png",
    "gifUrl": "https://assets.exercisedb.dev/media/1Ty9ywf.gif",
    "instructions": [
      "Connect a straight bar to the high pulley of a cable machine.",
      "Face the machine from a stable stance with feet about shoulder width.",
      "Sit tall and set the shoulders before drawing the handle down.",
      "Pull the handle down by driving your elbows toward your ribs; keep your torso steady.",
      "Pull with the elbows rather than leaning far back to move the handle.",
      "Let the handle rise steadily until the arms are long, then reset the shoulders."
    ]
  },
  "twin handle parallel grip lat pulldown": {
    "imageUrl": "https://assets.exercisedb.dev/media/5oyCDZw.png",
    "gifUrl": "https://assets.exercisedb.dev/media/wBcWW1U.gif",
    "instructions": [
      "Fit the seat to your body, then settle into the machine.",
      "Hold the handles with palms facing down, hands about shoulder width.",
      "Sit tall and set the shoulders before drawing the handle down.",
      "Pull the handle down by driving your elbows toward your ribs; keep your torso steady.",
      "Pull with the elbows rather than leaning far back to move the handle.",
      "Let the handle rise steadily until the arms are long, then reset the shoulders."
    ]
  },
  "machine seated row": {
    "imageUrl": "https://assets.exercisedb.dev/media/SYrK4wL.png",
    "gifUrl": "https://assets.exercisedb.dev/media/1eKnQuY.gif",
    "instructions": [
      "Set the seat height and footrests to a comfortable position.",
      "Take a seat on the machine with your chest against the pad and your feet on the footrests.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "machine t bar row": {
    "imageUrl": "https://assets.exercisedb.dev/media/LPRbdfy.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ijmGMWO.gif",
    "instructions": [
      "Set the seat height and footplate position to ensure proper alignment.",
      "Take a seat on the machine with your chest against the pad and your feet flat on the footplate.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "dumbbell single-arm bent-over row": {
    "imageUrl": "https://assets.exercisedb.dev/media/hH0NWZT.png",
    "gifUrl": "https://assets.exercisedb.dev/media/MPMXbnf.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell in one hand with your palm facing your body.",
      "Bend your knees slightly and hinge forward at the hips, with your spine steady and your core engaged.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Keep both shoulders level and resist turning toward the working arm.",
      "Reach the arms forward again without letting the torso lurch; switch sides when the set calls for it."
    ]
  },
  "inverted row": {
    "imageUrl": "https://assets.exercisedb.dev/media/7DDxV5l.png",
    "gifUrl": "https://assets.exercisedb.dev/media/mmdp5HH.gif",
    "instructions": [
      "Prepare a bar at waist height on a Smith machine or use a suspension trainer.",
      "Face the bar or suspension trainer and grab it with palms facing down, hands about shoulder width.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "cable seated wide-grip row": {
    "imageUrl": "https://assets.exercisedb.dev/media/SvoHEme.png",
    "gifUrl": "https://assets.exercisedb.dev/media/aroJMRd.gif",
    "instructions": [
      "Take a seat on the cable row machine with your feet flat on the footrests and your knees soft.",
      "Hold the handle with a wide overhand grip, palms facing down.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "pull-up (neutral grip)": {
    "imageUrl": "https://assets.exercisedb.dev/media/IA1oF9P.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ExMiPa8.gif",
    "instructions": [
      "Suspend yourself from a pull-up bar with a neutral grip (palms facing each other) and your arms straight.",
      "Brace your trunk and draw your shoulder blades toward each other.",
      "Begin from a controlled hang with the shoulders active rather than slack.",
      "Pull your elbows down and bring your upper chest toward the bar without kicking your legs.",
      "Avoid swinging the legs to clear the bar.",
      "Lower to long arms without dropping suddenly from the top."
    ]
  },
  "barbell pendlay row": {
    "imageUrl": "https://assets.exercisedb.dev/media/NAXCmOr.png",
    "gifUrl": "https://assets.exercisedb.dev/media/56JrNO2.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and your knees soft.",
      "Bend forward at the hips, with your spine steady and your chest up.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "chin-up": {
    "imageUrl": "https://assets.exercisedb.dev/media/zn9NfVg.png",
    "gifUrl": "https://assets.exercisedb.dev/media/XvMdy06.gif",
    "instructions": [
      "Suspend yourself from a pull-up bar with your palms facing toward you and your hands about shoulder width.",
      "Brace your trunk and pull your body up toward the bar, leading with your chest.",
      "Begin from a controlled hang with the shoulders active rather than slack.",
      "Pull your elbows down and bring your upper chest toward the bar without kicking your legs.",
      "Avoid swinging the legs to clear the bar.",
      "Lower to long arms without dropping suddenly from the top."
    ]
  },
  "dumbbell pullover": {
    "imageUrl": "https://assets.exercisedb.dev/media/kRalim9.png",
    "gifUrl": "https://assets.exercisedb.dev/media/T7vHf2u.gif",
    "instructions": [
      "Settle onto a bench with your head at one end and your feet on the floor.",
      "Take a dumbbell with both hands and extend your arms straight above your chest.",
      "Set the ribs down and keep a small elbow bend before lowering the weight.",
      "Lower the weight in an arc behind your head until you feel a comfortable shoulder stretch.",
      "Keep the ribs down as the arms travel overhead.",
      "Pull the weight back over the chest along the same arc, without lifting the ribs."
    ]
  },
  "barbell seated overhead press": {
    "imageUrl": "https://assets.exercisedb.dev/media/rwOa33x.png",
    "gifUrl": "https://assets.exercisedb.dev/media/CkmaUpi.gif",
    "instructions": [
      "Take a seat on a bench with your back straight and feet planted.",
      "Take hold of the barbell with palms facing down, just beyond shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell seated shoulder press": {
    "imageUrl": "https://assets.exercisedb.dev/media/OCB7lBH.png",
    "gifUrl": "https://assets.exercisedb.dev/media/BHFYLWn.gif",
    "instructions": [
      "Take a seat on a bench with a dumbbell in each hand, resting on your thighs.",
      "Before moving, raise the dumbbells to shoulder height, palms facing forward.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell arnold press": {
    "imageUrl": "https://assets.exercisedb.dev/media/0EsxuM4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/dho7HlN.gif",
    "instructions": [
      "Take a seat on a bench with back support and hold a dumbbell in each hand at shoulder level, palms facing your body and elbows bent.",
      "Press the dumbbells upward until your arms are straight and your palms are facing forward.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "cable lateral raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/Ojde5kZ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/a34bAPc.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and Hold the cable handles with palms facing down.",
      "Maintain straight arms and your core engaged.",
      "Start with a manageable load and a small bend in the elbows.",
      "Raise the arms out to the sides to about shoulder height without leaning or shrugging.",
      "Stop near shoulder height rather than shrugging to lift higher.",
      "Lower the arms slowly to your sides without swinging the weight."
    ]
  },
  "dumbbell front raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/sAefl3q.png",
    "gifUrl": "https://assets.exercisedb.dev/media/XCHKeeT.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell in each hand with your palms facing your thighs.",
      "With your arms straight, exhale and lift the dumbbells in front of you until they are at shoulder level.",
      "Start with a manageable load and a small bend in the elbows.",
      "Lift the arms forward to about shoulder height, keeping the ribs down and torso still.",
      "Stop near shoulder height rather than shrugging to lift higher.",
      "Lower the arms slowly to your sides without swinging the weight."
    ]
  },
  "dumbbell lateral raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/tSGb1A4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/dqr8AcJ.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold a dumbbell in each hand, palms facing your body.",
      "Keep your spine in a comfortable neutral position and Brace your trunk.",
      "Start with a manageable load and a small bend in the elbows.",
      "Raise the arms out to the sides to about shoulder height without leaning or shrugging.",
      "Stop near shoulder height rather than shrugging to lift higher.",
      "Lower the arms slowly to your sides without swinging the weight."
    ]
  },
  "machine shoulder press": {
    "imageUrl": "https://assets.exercisedb.dev/media/R3aCmVq.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ia1mm53.gif",
    "instructions": [
      "Set the seat height and backrest of the leverage machine to a comfortable position.",
      "Take a seat on the machine with your back against the backrest and your feet planted.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dumbbell push press": {
    "imageUrl": "https://assets.exercisedb.dev/media/6YZ4pBz.png",
    "gifUrl": "https://assets.exercisedb.dev/media/5uHmFDJ.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell in each hand at shoulder level.",
      "Before moving, bend your knees slightly and dip your body down, then explosively extend your legs and press the dumbbells overhead.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "cable standing rear delt row (with rope)": {
    "imageUrl": "https://assets.exercisedb.dev/media/fJxOSX4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/bKWKc0E.gif",
    "instructions": [
      "Face the cable machine from a stable stance with feet about shoulder width.",
      "Take hold of the cable attachment with both hands, palms facing each other, and step back to create tension in the cable.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "barbell upright row": {
    "imageUrl": "https://assets.exercisedb.dev/media/1PhNwRx.png",
    "gifUrl": "https://assets.exercisedb.dev/media/W3IbcBm.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold a barbell with palms facing down, hands just beyond shoulder width.",
      "Keep the barbell hanging ahead of your thighs, arms straight.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "dumbbell rear fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/DyavCMC.png",
    "gifUrl": "https://assets.exercisedb.dev/media/vuje1o4.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold a dumbbell in each hand.",
      "Bend your knees slightly and hinge forward at the hips, with your spine steady.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "With a soft bend in the elbows, sweep your arms together in a wide arc.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "machine seated reverse fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/22hwJBZ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/tdPPzL1.gif",
    "instructions": [
      "Fit the seat to your body, then settle into the machine.",
      "Hold the handles with palms facing down and keep your arms soft.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "Open your arms out and back with a slight elbow bend, drawing the shoulder blades together.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "dumbbell incline curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/XCPzWwf.png",
    "gifUrl": "https://assets.exercisedb.dev/media/jxTgBuV.gif",
    "instructions": [
      "Angle an incline bench to a 45-degree angle and sit on it with a dumbbell in each hand, palms facing forward.",
      "Set your upper arms on the incline bench and let your elbows hang down, straighten your arms.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "dumbbell biceps curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/VUqL7uk.png",
    "gifUrl": "https://assets.exercisedb.dev/media/gyy8qYl.gif",
    "instructions": [
      "Stand tall with a dumbbell in each hand, palms facing forward and arms straight.",
      "With your upper arms stationary, exhale and curl the weights while contracting your biceps.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "barbell curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/HHDDLAG.png",
    "gifUrl": "https://assets.exercisedb.dev/media/y9nzLD1.gif",
    "instructions": [
      "Stand tall with your feet about shoulder width and hold a barbell with palms facing up, palms facing forward.",
      "Hold your elbows near your torso and Breathe out and curl the weights while contracting your biceps.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "dumbbell rear delt row (shoulder)": {
    "imageUrl": "https://assets.exercisedb.dev/media/4AOkSqY.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Cr6lpL2.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and knees soft.",
      "Take a dumbbell in each hand with your palms facing your body.",
      "Set the torso and allow the arms to reach forward without rounding excessively.",
      "Draw your elbows back and bring the handle or weight toward your torso.",
      "Bring the elbows back without jerking the torso.",
      "Reach the arms forward again without letting the torso lurch."
    ]
  },
  "cable supine reverse fly": {
    "imageUrl": "https://assets.exercisedb.dev/media/mGWlz64.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Shpih3n.gif",
    "instructions": [
      "Connect a D-handle to a low pulley cable machine and Position yourself face down on a flat bench.",
      "Hold the D-handle with each hand, palms facing down, and extend your arms straight out in front of you.",
      "Keep a soft elbow bend and set the shoulders before moving the arms.",
      "Open your arms out and back with a slight elbow bend, drawing the shoulder blades together.",
      "Keep the elbow angle nearly unchanged through the arc.",
      "Open the arms back along the same arc without dropping the load."
    ]
  },
  "dumbbell hammer curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/Gvu1Bar.png",
    "gifUrl": "https://assets.exercisedb.dev/media/8Xmxuy8.gif",
    "instructions": [
      "Stand tall with a dumbbell in each hand, palms facing your torso.",
      "Hold your elbows near your torso and rotate the palms of your hands until they are facing forward.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Curl with palms facing each other and elbows near your sides; avoid rocking back.",
      "Keep the palms facing each other and the wrists straight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "cable curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/OVG4HnZ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/fGfSciM.gif",
    "instructions": [
      "Face the cable machine from a stable stance with feet about shoulder width.",
      "Hold the cable attachment with palms facing up.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "ez-bar curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/i1gP8Ls.png",
    "gifUrl": "https://assets.exercisedb.dev/media/5KMQw7b.gif",
    "instructions": [
      "Stand tall with your feet about shoulder width and hold the ez barbell with palms facing up.",
      "Hold your elbows near your torso and your upper arms stationary throughout the movement.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "barbell preacher curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/SVVTAHu.png",
    "gifUrl": "https://assets.exercisedb.dev/media/O5fWRAY.gif",
    "instructions": [
      "Take a seat on a preacher bench with your upper arms resting on the pad and your chest against the support.",
      "Hold the barbell with palms facing up, just beyond shoulder width.",
      "Set the working upper arm against the preacher pad and leave the elbow free to bend.",
      "Curl the weight while your upper arms stay in contact with the pad.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "ez-bar spider curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/1BBUBek.png",
    "gifUrl": "https://assets.exercisedb.dev/media/IPuL5eR.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold the ez barbell with palms facing up.",
      "Set your upper arms on a preacher bench or stability ball, letting your elbows to hang down.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "dumbbell concentration curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/ShZK2Oa.png",
    "gifUrl": "https://assets.exercisedb.dev/media/O5yQrZJ.gif",
    "instructions": [
      "Take a seat on a bench with your legs spread apart and a dumbbell in one hand, resting your elbow on the inside of your thigh.",
      "Fully extend your arm and hold the dumbbell with palms facing up.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Bend your elbows to bring the weight toward your shoulders without swinging your torso.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "dumbbell zottman curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/yczqYzq.png",
    "gifUrl": "https://assets.exercisedb.dev/media/2ReNsrE.gif",
    "instructions": [
      "Stand tall with a dumbbell in each hand, palms facing your body.",
      "Hold your elbows near your torso and rotate your palms to face forward.",
      "Set the shoulders and upper arms before bending the elbows.",
      "Curl palms-up, turn the palms down at the top, and lower with that overhand grip.",
      "Keep the torso quiet and let the elbow bend lift the weight.",
      "Lower until the elbows are nearly straight, keeping the upper arms still."
    ]
  },
  "cable overhead triceps extension (rope attachment)": {
    "imageUrl": "https://assets.exercisedb.dev/media/yfOpzR2.png",
    "gifUrl": "https://assets.exercisedb.dev/media/rGgZtRg.gif",
    "instructions": [
      "Connect a rope to a cable machine at a high position.",
      "Face the away from the machine from a stable stance with feet about shoulder width.",
      "Set the upper arms in place before extending the elbows.",
      "Keep the upper arms pointed upward and extend at the elbows without flaring the ribs.",
      "Keep the upper arms steady while the forearms travel.",
      "Bend the elbows slowly to return to the start of the next rep."
    ]
  },
  "barbell lying triceps extension skull crusher": {
    "imageUrl": "https://assets.exercisedb.dev/media/F0RcBtm.png",
    "gifUrl": "https://assets.exercisedb.dev/media/9DQq3ne.gif",
    "instructions": [
      "Settle onto a bench with your feet planted and your head at the end of the bench.",
      "Take hold of the barbell with palms facing down, hands about shoulder width, and extend your arms straight up over your chest.",
      "Set the upper arms in place before extending the elbows.",
      "Keep the upper arms steady and extend through the elbows to move the weight.",
      "Keep the upper arms steady while the forearms travel.",
      "Bend the elbows slowly to return to the start of the next rep."
    ]
  },
  "barbell close-grip bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/2f09mL6.png",
    "gifUrl": "https://assets.exercisedb.dev/media/QzpzVKu.gif",
    "instructions": [
      "Settle onto a bench with your feet planted and your back pressed against the bench.",
      "Hold the barbell with a close grip, slightly narrower than about shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "cable pushdown (with rope attachment)": {
    "imageUrl": "https://assets.exercisedb.dev/media/W07ngAa.png",
    "gifUrl": "https://assets.exercisedb.dev/media/FXEBPKb.gif",
    "instructions": [
      "Connect a rope attachment to a high pulley on a cable machine.",
      "Face the machine with your feet about shoulder width and a slight bend in your knees.",
      "Stand far enough from the stack for the cable to stay taut.",
      "Keep your elbows near your ribs and straighten your arms against the cable.",
      "Keep the elbows close to the body instead of letting the shoulders swing.",
      "Ease back to the start before repeating."
    ]
  },
  "dumbbell kickback": {
    "imageUrl": "https://assets.exercisedb.dev/media/BLAOphv.png",
    "gifUrl": "https://assets.exercisedb.dev/media/WXj8zom.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and hold a dumbbell in each hand.",
      "Bend your knees slightly and hinge forward at the hips, with your spine steady.",
      "Set the upper arms in place before extending the elbows.",
      "Hold the upper arm beside your torso and straighten the elbow behind you.",
      "Keep the upper arms steady while the forearms travel.",
      "Bend the elbows slowly to return to the start of the next rep."
    ]
  },
  "bench dip (knees bent)": {
    "imageUrl": "https://assets.exercisedb.dev/media/oVMoKBc.png",
    "gifUrl": "https://assets.exercisedb.dev/media/7PIvDyS.gif",
    "instructions": [
      "Take a seat on the edge of a bench or chair with your hands gripping the edge next to your hips.",
      "Move your butt off the bench and straighten your legs in front of you, keeping your heels on the ground.",
      "Set the shoulders down and keep the elbows pointed mostly behind you.",
      "Bend the elbows to lower between the supports; stop at a comfortable shoulder depth.",
      "Choose a depth that lets the shoulders stay comfortable.",
      "Press through the hands to rise, then reset the shoulders before another rep."
    ]
  },
  "dumbbell seated triceps extension": {
    "imageUrl": "https://assets.exercisedb.dev/media/GunWVFy.png",
    "gifUrl": "https://assets.exercisedb.dev/media/65aYXVr.gif",
    "instructions": [
      "Take a seat on a bench with your back straight and feet planted.",
      "Take a dumbbell with both hands and extend your arms straight up overhead.",
      "Set the upper arms in place before extending the elbows.",
      "Keep the upper arms steady and extend through the elbows to move the weight.",
      "Keep the upper arms steady while the forearms travel.",
      "Bend the elbows slowly to return to the start of the next rep."
    ]
  },
  "diamond push-up": {
    "imageUrl": "https://assets.exercisedb.dev/media/Ks9V0OX.png",
    "gifUrl": "https://assets.exercisedb.dev/media/GohQYeh.gif",
    "instructions": [
      "Begin in a high plank position with your hands close together, forming a diamond shape with your thumbs and index fingers.",
      "Hold your body in a straight line from head to toe, engaging your core and glutes.",
      "Brace the abdomen and glutes so the shoulders, hips and ankles move together.",
      "Bend your elbows to lower your chest while keeping your body in one line.",
      "Keep the head in line with the spine as the elbows bend.",
      "Press back to straight arms, keeping the body line intact."
    ]
  },
  "barbell jm bench press": {
    "imageUrl": "https://assets.exercisedb.dev/media/fYppQBR.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ShxX3RB.gif",
    "instructions": [
      "Settle onto a bench with your feet planted and your back pressed against the bench.",
      "Hold the barbell with palms facing down, just beyond shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Keep the wrists stacked and use a shoulder path that feels natural.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "cable pushdown": {
    "imageUrl": "https://assets.exercisedb.dev/media/7y4QhOw.png",
    "gifUrl": "https://assets.exercisedb.dev/media/QyE42pp.gif",
    "instructions": [
      "Connect a straight bar to a high pulley cable machine.",
      "Face the machine with your feet about shoulder width and a slight bend in your knees.",
      "Stand far enough from the stack for the cable to stay taut.",
      "Keep your elbows near your ribs and straighten your arms against the cable.",
      "Keep the elbows close to the body instead of letting the shoulders swing.",
      "Ease back to the start before repeating."
    ]
  },
  "barbell full squat": {
    "imageUrl": "https://assets.exercisedb.dev/media/eH0hYEa.png",
    "gifUrl": "https://assets.exercisedb.dev/media/7eOhEbW.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, toes slightly turned out.",
      "Rest the bar across the upper back and take a secure grip.",
      "Brace the abdomen and spread pressure across the whole foot.",
      "Bend at the hips and knees to lower, keeping your feet grounded and knees tracking with the toes.",
      "Drive upward with the chest and hips rising together; keep the knees from collapsing inward.",
      "Stand fully, reset your footing and breathing, then begin the next descent."
    ]
  },
  "barbell front squat": {
    "imageUrl": "https://assets.exercisedb.dev/media/zPXPiyY.png",
    "gifUrl": "https://assets.exercisedb.dev/media/6Gk2RCs.gif",
    "instructions": [
      "Begin by standing with your feet about shoulder width, toes slightly turned out.",
      "Take hold of the barbell ahead of your shoulders, resting it on your collarbone and shoulders.",
      "Brace the abdomen and spread pressure across the whole foot.",
      "Bend at the hips and knees to lower, keeping your feet grounded and knees tracking with the toes.",
      "Drive upward with the chest and hips rising together; keep the knees from collapsing inward.",
      "Stand fully, reset your footing and breathing, then begin the next descent."
    ]
  },
  "walking lunge": {
    "imageUrl": "https://assets.exercisedb.dev/media/b91sWLI.png",
    "gifUrl": "https://assets.exercisedb.dev/media/8pIPUyP.gif",
    "instructions": [
      "Stand and set your feet about shoulder width.",
      "Step forward with your right leg, lowering your body into a lunge position.",
      "Set your stance wide enough to balance before bending either knee.",
      "Step into the movement and bend both knees, keeping your front foot planted.",
      "Keep the front foot planted and avoid collapsing inward at the knee.",
      "Push through the lead foot to return to the start, then change legs as planned."
    ]
  },
  "sled 45° leg press": {
    "imageUrl": "https://assets.exercisedb.dev/media/durfugx.png",
    "gifUrl": "https://assets.exercisedb.dev/media/s41flaL.gif",
    "instructions": [
      "Set the seat and footplate of the sled machine to a comfortable position.",
      "Take a seat on the sled machine with your back against the backrest and your feet about shoulder width on the footplate.",
      "Set your feet firmly on the plate and keep the hips against the seat.",
      "Bend the knees to bring the platform toward you, then press it away through the feet.",
      "Stop the descent before the hips lift from the seat.",
      "Bring the weight or body back to its starting position without rushing."
    ]
  },
  "sled hack squat": {
    "imageUrl": "https://assets.exercisedb.dev/media/Pk0XLjZ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/tb3FEPQ.gif",
    "instructions": [
      "Set the sled machine to a comfortable position for your height.",
      "Stand and set your feet about shoulder width on the platform, toes slightly pointed outwards.",
      "Brace the abdomen and spread pressure across the whole foot.",
      "Bend at the hips and knees to lower, keeping your feet grounded and knees tracking with the toes.",
      "Drive upward with the chest and hips rising together; keep the knees from collapsing inward.",
      "Stand fully, reset your footing and breathing, then begin the next descent."
    ]
  },
  "machine leg extension": {
    "imageUrl": "https://assets.exercisedb.dev/media/ANHegeX.png",
    "gifUrl": "https://assets.exercisedb.dev/media/QAV2j3D.gif",
    "instructions": [
      "Set the seat height and backrest of the machine to fit your body.",
      "Take a seat on the machine with your back against the backrest and your feet on the footpad.",
      "Set the pad just above the ankles and keep the thighs against the seat.",
      "Straighten your knees to lift the pad, keeping your hips against the seat.",
      "Lift without swinging and avoid snapping the knees straight.",
      "Bring the weight or body back to its starting position without rushing."
    ]
  },
  "dumbbell single leg split squat": {
    "imageUrl": "https://assets.exercisedb.dev/media/m5XGyIE.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Uvfn4gM.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell in each hand.",
      "Step forward with one foot and position your feet so that your front foot is flat on the ground and your back foot is elevated on a bench or step.",
      "Brace the abdomen and spread pressure across the whole foot.",
      "Bend at the hips and knees to lower, keeping your feet grounded and knees tracking with the toes.",
      "Drive upward with the chest and hips rising together; keep the knees from collapsing inward.",
      "Stand fully, reset your footing and breathing, then begin the next descent."
    ]
  },
  "dumbbell goblet squat": {
    "imageUrl": "https://assets.exercisedb.dev/media/vLHdW9n.png",
    "gifUrl": "https://assets.exercisedb.dev/media/NYeJ8aa.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell vertically against your chest with both hands.",
      "With your chest up and core engaged, lower your body down into a squat position by pushing your hips back and bending your knees.",
      "Brace the abdomen and spread pressure across the whole foot.",
      "Bend at the hips and knees to lower, keeping your feet grounded and knees tracking with the toes.",
      "Drive upward with the chest and hips rising together; keep the knees from collapsing inward.",
      "Stand fully, reset your footing and breathing, then begin the next descent."
    ]
  },
  "barbell deadlift": {
    "imageUrl": "https://assets.exercisedb.dev/media/sG1aOZ5.png",
    "gifUrl": "https://assets.exercisedb.dev/media/bQhS1y5.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and the barbell on the ground in front of you.",
      "Bend your knees and hinge at the hips to lower your torso and grip the barbell with palms facing down, hands just beyond shoulder width.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Push the hips back while keeping the load close and the spine steady.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "dumbbell step-up": {
    "imageUrl": "https://assets.exercisedb.dev/media/0esZZqQ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/oQHluyU.gif",
    "instructions": [
      "Take your place in front of a bench or step with a dumbbell in each hand, palms facing your body.",
      "Set your right foot on the bench or step, ensuring your entire foot is in contact with the surface.",
      "Put the lead foot fully on the platform before shifting your weight onto it.",
      "Step onto the platform and drive through the lead foot to stand tall on it.",
      "Keep the front foot planted and avoid collapsing inward at the knee.",
      "Push through the lead foot to return to the start, then change legs as planned."
    ]
  },
  "machine seated leg curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/WJjdGv4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Z6hO3Uj.gif",
    "instructions": [
      "Set the machine to fit your body and sit on it with your back against the backrest.",
      "Set your lower legs under the padded lever, just above your ankles.",
      "Line the knees up with the machine or bench edge before starting the curl.",
      "Bend your knees to draw the pad toward you without lifting your hips from the support.",
      "Keep the hips still while the knees bend.",
      "Return along the same path at a controlled pace."
    ]
  },
  "barbell romanian deadlift": {
    "imageUrl": "https://assets.exercisedb.dev/media/ttcR7aH.png",
    "gifUrl": "https://assets.exercisedb.dev/media/DHSg8y4.gif",
    "instructions": [
      "Stand and set your feet about shoulder width and your toes pointing forward.",
      "Take hold of the barbell with palms facing down, hands just beyond shoulder width.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Send your hips back with a soft knee bend, lowering the load close to your legs until the hamstrings stretch.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "dumbbell stiff leg deadlift": {
    "imageUrl": "https://assets.exercisedb.dev/media/Godq1jA.png",
    "gifUrl": "https://assets.exercisedb.dev/media/d6FAtsq.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, holding a dumbbell in each hand with palms facing down.",
      "With your back straight and your core engaged, hinge at the hips and lower the dumbbells toward the ground, letting a slight bend in your knees.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Push the hips back while keeping the load close and the spine steady.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "machine lying leg curl": {
    "imageUrl": "https://assets.exercisedb.dev/media/aUXwuCV.png",
    "gifUrl": "https://assets.exercisedb.dev/media/8XpTCDL.gif",
    "instructions": [
      "Set the machine to fit your body and select the desired weight.",
      "Position yourself face down on the machine with your legs straight and your heels against the padded lever.",
      "Line the knees up with the machine or bench edge before starting the curl.",
      "Bend your knees to draw the pad toward you without lifting your hips from the support.",
      "Keep the hips still while the knees bend.",
      "Ease back to the start before repeating."
    ]
  },
  "barbell glute bridge": {
    "imageUrl": "https://assets.exercisedb.dev/media/GHJOxXF.png",
    "gifUrl": "https://assets.exercisedb.dev/media/4oQEPT8.gif",
    "instructions": [
      "Begin by lying flat on your back on the ground with your knees bent and feet planted.",
      "Set a barbell across your hips, holding it securely with both hands.",
      "Plant the feet and keep the ribs from flaring as the hips prepare to rise.",
      "Press through the feet and lift your hips until your torso and thighs line up.",
      "Stop when the hips line up with the torso; do not arch higher through the lower back.",
      "Lower the hips steadily and keep the feet planted for the next lift."
    ]
  },
  "glute-ham raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/zObuuC0.png",
    "gifUrl": "https://assets.exercisedb.dev/media/eekU8gl.gif",
    "instructions": [
      "Set the glute-ham raise machine to fit your body.",
      "Set yourself face down on the machine with your ankles secured.",
      "Line the knees up with the machine or bench edge before starting the curl.",
      "Bend your knees to draw the pad toward you without lifting your hips from the support.",
      "Keep the hips still while the knees bend.",
      "Return along the same path at a controlled pace."
    ]
  },
  "kettlebell swing": {
    "imageUrl": "https://assets.exercisedb.dev/media/SM93VF4.png",
    "gifUrl": "https://assets.exercisedb.dev/media/YGaxrLf.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, toes pointed slightly outward.",
      "Take hold of the kettlebell with both hands ahead of your body, arms extended.",
      "Set the shoulders and let the weight move back between the legs as the hips hinge.",
      "Hinge back, then drive the hips forward to send the weight up; let the arms guide it.",
      "Let the hips, not the shoulders, provide the power.",
      "Let the weight fall naturally and hinge again for the next swing."
    ]
  },
  "low glute bridge on floor": {
    "imageUrl": "https://assets.exercisedb.dev/media/nIBNmwQ.png",
    "gifUrl": "https://assets.exercisedb.dev/media/GIBFV5p.gif",
    "instructions": [
      "Settle onto your back with your knees bent and feet planted.",
      "Set your arms by your sides, palms facing down.",
      "Plant the feet and keep the ribs from flaring as the hips prepare to rise.",
      "Press through the feet and lift your hips until your torso and thighs line up.",
      "Stop when the hips line up with the torso; do not arch higher through the lower back.",
      "Lower the hips steadily and keep the feet planted for the next lift."
    ]
  },
  "barbell good morning": {
    "imageUrl": "https://assets.exercisedb.dev/media/JwnhPkB.png",
    "gifUrl": "https://assets.exercisedb.dev/media/0bb3W8m.gif",
    "instructions": [
      "Begin by standing with your feet about shoulder width and the barbell resting on your upper back.",
      "With your back straight and your core engaged, hinge forward at the hips, pushing your buttocks back as if you were trying to touch the wall behind you with your glutes.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Push the hips back while keeping the load close and the spine steady.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "cable kickback": {
    "imageUrl": "https://assets.exercisedb.dev/media/g70ehCV.png",
    "gifUrl": "https://assets.exercisedb.dev/media/66vosCP.gif",
    "instructions": [
      "Face the cable machine from a stable stance with feet about shoulder width.",
      "Take hold of the cable handle with your right hand and step back to create tension in the cable.",
      "Set the upper arms in place before extending the elbows.",
      "Hold the upper arm beside your torso and straighten the elbow behind you.",
      "Keep the upper arms steady while the forearms travel.",
      "Bend the elbows slowly to return to the start of the next rep."
    ]
  },
  "barbell seated calf raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/CDkglPr.png",
    "gifUrl": "https://assets.exercisedb.dev/media/MhVq1HC.gif",
    "instructions": [
      "Plant both feet while seated on a bench; a barbell resting on your thighs.",
      "Set the balls of your feet on a raised platform, such as a block or step.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "standing calf raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/tEERyBX.png",
    "gifUrl": "https://assets.exercisedb.dev/media/54MgsCv.gif",
    "instructions": [
      "Stand and set your feet about shoulder width, toes pointing forward.",
      "Before moving, raise your heels off the ground as high as possible, standing on your toes.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "cable pull through (with rope)": {
    "imageUrl": "https://assets.exercisedb.dev/media/Bdznj9M.png",
    "gifUrl": "https://assets.exercisedb.dev/media/FSgcbwV.gif",
    "instructions": [
      "Stand facing away from the low pulley with the rope passing between your legs.",
      "Take hold of the rope attachment with both hands and step forward, creating tension in the cable.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Push the hips back while keeping the load close and the spine steady.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "machine seated hip abduction": {
    "imageUrl": "https://assets.exercisedb.dev/media/gJdsKjU.png",
    "gifUrl": "https://assets.exercisedb.dev/media/vzTs3hv.gif",
    "instructions": [
      "Set the seat height so that your knees are at a 90-degree angle.",
      "Take a seat on the machine with your back against the backrest and your feet on the footrests.",
      "Square the pelvis before moving the working leg.",
      "Open the knees or legs against resistance without shifting your torso.",
      "Move only as far as the pelvis can remain steady.",
      "Bring the weight or body back to its starting position without rushing."
    ]
  },
  "barbell sumo deadlift": {
    "imageUrl": "https://assets.exercisedb.dev/media/Z95MXOr.png",
    "gifUrl": "https://assets.exercisedb.dev/media/3cNUiO0.gif",
    "instructions": [
      "Stand and set your feet wider than about shoulder width, toes pointing outwards.",
      "Set a barbell on the ground in front of you, centered between your feet.",
      "Unlock the knees and brace the abdomen before moving the hips back.",
      "Push the hips back while keeping the load close and the spine steady.",
      "Keep the weight close to the legs and stop when the back would begin to round.",
      "Drive the hips forward to stand tall without leaning back at the top."
    ]
  },
  "sled calf press on leg press": {
    "imageUrl": "https://assets.exercisedb.dev/media/TtFUu3t.png",
    "gifUrl": "https://assets.exercisedb.dev/media/lofhk0Z.gif",
    "instructions": [
      "Set the seat of the leg press machine so that your knees are soft when your feet are on the sled.",
      "Set your feet about shoulder width on the sled, with your toes pointing forward.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "smith standing leg calf raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/U0iKJjt.png",
    "gifUrl": "https://assets.exercisedb.dev/media/cVorkDp.gif",
    "instructions": [
      "Set the smith machine bar to a height that allows you to stand with your feet planted and your shoulders under the bar.",
      "Set yourself under the bar with your feet about shoulder width and your toes pointing forward.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "wheel rollout": {
    "imageUrl": "https://assets.exercisedb.dev/media/qEDHmOy.png",
    "gifUrl": "https://assets.exercisedb.dev/media/ujrDPcu.gif",
    "instructions": [
      "Get down on the floor and place the wheel roller in front of you.",
      "Set your hands on the handles of the wheel roller and extend your arms straight out in front of you.",
      "Tighten the abdomen and keep the pelvis tucked before the arms reach away.",
      "Reach the arms away while keeping your ribs and pelvis aligned; stop before the lower back sags.",
      "Stop reaching when the lower back starts to sag.",
      "Pull back to the start through your shoulders and abdominals, keeping the same body line."
    ]
  },
  "dumbbell single leg calf raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/aoHjwGT.png",
    "gifUrl": "https://assets.exercisedb.dev/media/tjfcoUc.gif",
    "instructions": [
      "Step onto the edge of a step or platform with your heels hanging off and your toes on the step.",
      "Take a dumbbell in one hand and place your other hand on a wall or railing for support.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "hanging leg raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/eIgl1D2.png",
    "gifUrl": "https://assets.exercisedb.dev/media/gK68WNd.gif",
    "instructions": [
      "Suspend yourself from a pull-up bar with your arms straight and your palms turned away from you.",
      "Brace your trunk and lift your legs up in front of you, keeping them straight.",
      "Brace the abdomen and keep the shoulders anchored to the support.",
      "Lift your legs by bracing your trunk and moving at the hips rather than swinging.",
      "Slow the legs before they pull the lower back out of position.",
      "Lower the legs slowly without swinging or losing your trunk position."
    ]
  },
  "machine donkey calf raise": {
    "imageUrl": "https://assets.exercisedb.dev/media/g53mnTB.png",
    "gifUrl": "https://assets.exercisedb.dev/media/Xcm2d9d.gif",
    "instructions": [
      "Set the leverage machine to the appropriate height for your body.",
      "Set yourself facing the machine, with your toes on the foot platform and your heels hanging off the edge.",
      "Let the ankles move freely while the rest of the body stays quiet.",
      "Rise through the balls of your feet, lifting the heels as high as you can without rocking.",
      "Pause at the top without rolling the ankles outward.",
      "Lower the heels at a measured pace before rising again."
    ]
  },
  "cable kneeling crunch": {
    "imageUrl": "https://assets.exercisedb.dev/media/xM1AmlB.png",
    "gifUrl": "https://assets.exercisedb.dev/media/nB3Wnro.gif",
    "instructions": [
      "Connect a rope handle to a high pulley and kneel down turned away from the machine.",
      "Take hold of the rope handle with both hands and place it behind your head, keeping your elbows out to the sides.",
      "Set the pelvis and keep the neck relaxed before curling upward.",
      "Curl your rib cage toward your pelvis, letting the abdominals move the torso.",
      "Leave a little space between the chin and chest; keep the movement in the torso.",
      "Lower the shoulders or torso with control before the next curl."
    ]
  },
  "band horizontal pallof press": {
    "imageUrl": "https://assets.exercisedb.dev/media/w2QrZjO.png",
    "gifUrl": "https://assets.exercisedb.dev/media/7Ro0JiJ.gif",
    "instructions": [
      "Connect the band to a sturdy anchor point at waist height.",
      "Stand perpendicular to the anchor point with your feet about shoulder width.",
      "Brace the torso and align the wrists with the forearms.",
      "Press the weight or handles away while keeping your trunk braced.",
      "Control the band on the way back instead of letting it snap you into position.",
      "Lower the weight to its starting height under control before pressing again."
    ]
  },
  "dead bug": {
    "imageUrl": "https://assets.exercisedb.dev/media/I0EOxCs.png",
    "gifUrl": "https://assets.exercisedb.dev/media/86KYFtG.gif",
    "instructions": [
      "Settle onto your back with your arms extended toward the ceiling.",
      "Before moving, bend your knees and lift your legs off the ground, creating a 90-degree angle at your hips and knees.",
      "Brace the trunk lightly before moving a limb.",
      "Move the working arm or leg while keeping the trunk steady and the breathing even.",
      "Keep the pelvis from rocking as the arm or leg moves.",
      "Reset your posture before changing sides or beginning the next rep."
    ]
  },
  "russian twist": {
    "imageUrl": "https://assets.exercisedb.dev/media/ZXoLCb8.png",
    "gifUrl": "https://assets.exercisedb.dev/media/JdI2ZU8.gif",
    "instructions": [
      "Take a seat on the ground with your knees bent and feet planted.",
      "Lean back slightly while with your spine steady and your core engaged.",
      "Set the pelvis and make the turn through the rib cage.",
      "Turn through the torso while the hips and lower body stay as steady as the setup allows.",
      "Keep the turn smooth instead of throwing the arms across the body.",
      "Return through center before turning to the other side."
    ]
  }
};
