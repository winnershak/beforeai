import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';

// Define the tutorial content type
interface TutorialContent {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: string[];
  shareable?: boolean; // Flag to determine if content should have a share button
}

export default function TutorialDetailScreen() {
  // Hide the header completely
  React.useEffect(() => {
    // This ensures the header with the path is not shown
    router.setParams({ headerShown: 'false' });
  }, []);

  const { id } = useLocalSearchParams();
  
  // Tutorial content database
  const tutorialContents: Record<string, TutorialContent> = {
    '1': {
      id: '1',
      title: 'How to Use This App',
      icon: 'phone-portrait-outline',
      color: '#FF3B30',
      content: [
        "This app isn't just a sleep tracker — it's your new sleep coach. Here's how to use each feature to fix your sleep tonight.",
        "Key Tips:",
        "🎵 Sleep Sounds: Pick a calming sound (rain, ocean, brown noise) and play it 20–30 minutes before bed. This helps your brain wind down.",
        "🔒 App Blocker: Set a block time (like 9 PM) to stop doomscrolling on apps like TikTok, Instagram, or YouTube.",
        "⏰ Smart Alarms: Set a consistent wake time with our gentle alarm. Wakes you with sound (and optionally vibration) even in silent mode.",
        "✅ Tutorial Blocks: Go through each block to learn how sleep really works — and how to master it."
      ],
      shareable: false
    },
    '2': {
      id: '2',
      title: 'Why Bad Sleep Destroys You',
      icon: 'warning-outline',
      color: '#FF9500',
      content: [
        "Bad sleep isn't just \"feeling tired.\" It ruins how you look, feel, and perform — and yes, people can tell.",
        
        "🔪 What Happens When You Sleep Badly",
        
        "😴 You look more tired — and less attractive.\nA study in *Sleep* journal found that people rate sleep-deprived faces as less healthy, less attractive, and less trustworthy. (Swedish study, 2010) [Axelsson et al., BMJ]",
        
        "🧬 Your skin suffers.\nSleep boosts collagen production and reduces inflammation. Without it, you get more acne, dullness, under-eye bags, and premature aging. Cortisol (stress hormone) rises and breaks down your skin barrier. [Oyetakin-White et al., J Clin Sleep Med, 2013]",
        
        "🍩 You gain fat easier.\nSleep affects hunger hormones — ghrelin goes up, leptin goes down — making you hungrier and more likely to binge. One study showed just 5 nights of poor sleep led to 300+ extra calories eaten per day. [Spiegel et al., PLoS Med, 2004]",
        
        "🤧 You get sick more often.\nWith less sleep, your immune system weakens. People who sleep less than 6 hours are 4x more likely to catch colds. (NIH-backed research) [Cohen et al., Arch Intern Med, 2009]",
        
        "💡 You lose brainpower.\nSleep deprivation lowers focus, memory, and creativity. It's harder to think clearly or solve problems. Reaction times slow down — it's like being drunk. [Lim & Dinges, Sleep, 2010]",
        
        "👥 Your social skills drop.\nYou misread emotions, get more irritable, and feel more anxious. One study showed people feel lonelier — and are rated as less approachable — after poor sleep. [Ben Simon & Walker, Nat. Comms, 2018]",
        
        "💼 Your productivity drops — and your income might too.\nSleep-deprived workers are less focused and more likely to call out sick. Lost sleep costs the U.S. economy $411 billion per year due to poor performance. (Rand Corp, 2017)",
        
        "⚠️ The long-term effects are serious:\n\n48% higher risk of heart disease\n38% higher risk of diabetes\nLinked to Alzheimer's, depression, early death\n(Source: CDC, Sleep Foundation, Dr. Matthew Walker)",
        
        "🚗 And yes — it's deadly.\nDrowsy driving causes over 100,000 car crashes a year in the U.S. alone, killing thousands. Just 2 hours of missed sleep doubles your crash risk. [AAA Foundation, 2016]",
                
        "📲 Share This\nSleep problems are everywhere — and they're hurting people you care about. Your friends, your parents, even your grandparents may not realize how much sleep is affecting their mood, health, or heart.",
        
        "Share this with someone you love. Help them sleep better. Help them live longer.\nBe the reason they finally understand how powerful sleep really is. Be the one who cared.",
        
        "💤 And if you want to take control of your own sleep? \n BlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking — everything you need to finally rest right.",

        "Start tonight. Sleep better. Live better."
      ],
      shareable: true
    },
    '3': {
      id: '3',
      title: 'How to Fall Asleep Fast',
      icon: 'bed-outline',
      color: '#FFCC00',
      content: [
        "Fall asleep in minutes — even under pressure.",

        "🪖 During WWII, U.S. Navy pilots were crashing — not from bad flying, but from **lack of sleep**.  \nSo the military created a method to help soldiers fall asleep **anywhere — on a boat, in battle, under pressure.**  \nAfter 6 weeks of training, 96% of soldiers could fall asleep in under 2 minutes using this technique.",

        "🧠 How to Fall Asleep Fast (Like the Military Does)",
        
        "This method was created to help soldiers fall asleep anytime — even during war. It takes practice, but it works. Most people get it after doing it every night for 1–2 weeks.",
        
        "Here's what to do:",
        
        "1. **Lie down and take a slow breath.**  \nBreathe in through your nose for 4 seconds… then out through your mouth for 4 seconds. Do this 2–3 times, slowly. Let your body start to relax.",
        
        "2. **Relax your face.**  \nLet your forehead go soft. Drop your jaw a little. Let your tongue rest gently in your mouth. Imagine your face melting into the pillow.",
        
        "3. **Drop your shoulders.**  \nLet them fall low. Now slowly relax your arms, one at a time — from your upper arms, to your elbows, to your hands and fingers. Let your arms feel heavy and loose.",
        
        "4. **Relax your chest.**  \nTake a slow breath out. Feel your chest get soft and warm. Let it sink deeper into your bed.",
        
        "5. **Relax your legs.**  \nStart at the top and work your way down — thighs, knees, calves, ankles, feet. Let your legs feel heavy, like they're sinking into the mattress.",
        
        "6. **Clear your mind.**  \nPicture something peaceful — like a quiet lake at night, or floating on a soft cloud in the sky. Keep that picture in your mind for 10 seconds.",
        
        "7. **If your brain starts thinking too much, repeat this in your head:**  \n\"Don't think... don't think... don't think...\"  \nSay it slowly in your mind for 10 seconds until your thoughts fade away.",
        
        "💡 Don't worry if it doesn't work the first night. Keep practicing this every night. It gets easier — and your brain will start to fall asleep faster on its own.",

        "✅ Other science-backed ways to fall asleep faster:",

        "🌙 Build a sleep ritual.\nDim lights. Play a sleep sound. Stretch or journal. Do this 30–60 minutes before bed — same routine, every night. Your brain will get the cue.",
        
        "⛔ Stop watching the clock.\nLooking at the time raises anxiety. Turn the clock away. Let go of control. Trust your body — it wants to sleep.",

        "🛏 Don't force it.\nOnly go to bed when sleepy. Still awake after 20 mins? Get up, go to a dim room, and do something quiet (no screens) until you're drowsy.",

        "🏠 Make your room sleep-ready:\nCool (60–67°F), dark, and quiet. Or use white noise. Think: cave mode. [Sleep Foundation]",

        "📲 Share This\nKnow someone who lies awake at night overthinking? Send them this. You might help them sleep for the first time in weeks.",

        "💤And if you're ready to master sleep:\nBlissAlarm app helped 100,000 people get better sleep with relaxing sounds, smart alarms, and app blocking — so your brain gets the message: 'It's time to sleep.'",

        "Do the routine. Run the method. Wake up refreshed."
      ],
      shareable: true
    },
    '4': {
      id: '4',
      title: 'Your Phone Is Killing Your Sleep',
      icon: 'phone-off-outline',
      color: '#4CD964',
      content: [
        "Your phone's blue light tricks your brain into thinking it's daytime, making sleep nearly impossible.",

        "📱 Phone screens = no melatonin\nBlue light stops your sleep hormone. Without melatonin, your body stays alert instead of winding down. (Harvard Health)",

        "⏰ Just 15 minutes does damage\nA short scroll before bed can delay sleep by an hour and make your rest less refreshing. (Sleep Foundation)",

        "😟 Social media keeps you wired\nApps trigger dopamine—keeping you alert and anxious when you should be relaxing. (Journal of Adolescence, 2019)",

        "🚨 How it hurts your body long-term:\n- Constant exhaustion and low energy\n- Memory and focus problems\n- Mood swings, irritability, and anxiety\n- A weaker immune system (more colds and sickness)",

        "✅ How to fix it—starting tonight:",

        "1. Set a digital cutoff\nUse BlissAlarm app to block distracting apps and websites at least 1 hour before bed.",

        "2. Activate night mode\nIf you must use your phone, enable a blue-light filter or night mode. It helps, but fully blocking apps is best.",

        "📲 Share This\nSleep problems are everywhere—and they're hurting people you care about. Your friends, your parents, even your grandparents may not realize how much sleep is affecting their mood, health, or heart.",

        "Share this with someone you love. Help them sleep better. Help them live longer.\nBe the reason they finally understand how powerful sleep really is. Be the one who cared.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Tonight, choose sleep over scrolling."
      ],
      shareable: true
    },
    '5': {
      id: '5',
      title: 'Wake Up Right',
      icon: 'sunny-outline',
      color: '#5856D6',
      content: [
        "🌅 Wake Up Right",

        "Want better sleep? Start by fixing your mornings. Waking up the right way makes it easier to fall asleep at night — and helps you feel more energized during the day.",

        "⏰ Why snoozing is worse than you think\nWhen you hit snooze and drift back to sleep, your brain starts a new sleep cycle. Getting yanked out of that after 5 or 10 minutes leads to 'sleep inertia' — that heavy, groggy feeling that can stick with you for hours.",

        "☀️ Light is your brain's natural alarm\nGetting sunlight within 30 minutes of waking helps reset your internal clock. It tells your brain to stop making melatonin (the sleep hormone) and start producing energy and focus chemicals. Even cloudy daylight is way stronger than indoor light.",

        "🚶 Move a little\nStretch. Walk to the bathroom. Wash your face. Light movement tells your body it's time to wake up fully — no caffeine required.",

        "📷 Try a QR code alarm\nTo make waking up easier, you can use an alarm that requires scanning a QR code — like one on your bathroom mirror or across the room. This small habit forces you to move, which makes it way harder to fall back into bed. Apps like BlissAlarm include this feature.",

        "📆 Try this for a week:\n- Wake up at the same time every day (yes, even weekends)\n- Get natural light ASAP\n- Use an alarm that gets you moving (no snoozing!)",

        "📲 Share This\nMost people try to fix their nights — but mornings might matter even more. Send this to someone who's always late, groggy, or snoozing every day.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Start your day right. It changes everything."
      ],
      shareable: true
    },
    '6': {
      id: '6',
      title: 'Build a Night Routine',
      icon: 'moon-outline',
      color: '#007AFF',
      content: [
        "🌙 Build a Night Routine",

        "You can't just crash into sleep. Your brain needs a signal that the day is ending — and that signal is your night routine.",

        "🧠 Why it works\nA consistent routine helps your brain wind down and start producing melatonin, the hormone that makes you sleepy. When you do the same things every night before bed, your body starts to expect sleep — and delivers it faster.",

        "😴 It's not about perfection. It's about repetition.\nEven a simple routine works if you repeat it every night. The key is to make it calm, screen-free, and consistent.",

        "✅ Here's an easy one to start with:\n- 1 hour before bed: turn off notifications and screens\n- 45 minutes before: dim the lights\n- 30 minutes before: stretch, journal, or read\n- 15 minutes before: play calming sound or meditation\n- Go to bed only when you're feeling sleepy — not just because the clock says so",

        "🎯 Do the same steps, in the same order, every night. That's what turns it into a habit — and habits are what make sleep feel effortless.",

        "📲 Share This\nMost people don't sleep well because they don't give their brain a chance to slow down. If you know someone who's always up late but doesn't want to be — send them this.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Build the habit. Train your brain. Sleep will follow."
      ],
      shareable: true
    },
    '7': {
      id: '7',
      title: 'Set Up Your Sleep Cave',
      icon: 'home-outline',
      color: '#5AC8FA',
      content: [
        "🛏️ Set Up Your Sleep Cave",

        "Your bedroom should be a cave: cold, dark, and quiet. Not a second living room, not a Netflix zone — a place where your brain goes, 'Ah, it's sleep time.'",

        "🌑 Total darkness = deeper sleep\nEven dim light — like a bedside lamp or hallway glow — can suppress melatonin by over 50% and reduce REM sleep. (Harvard Medical School, 2022) Cover or remove every light source. Use blackout curtains. Flip your phone face-down.",

        "❄️ Keep it cool\nThe ideal room temperature for sleep is **60–67°F (15–19°C)**. Studies show that a drop in body temperature helps trigger sleepiness and leads to deeper sleep cycles. (NIH, 2008)",

        "🔇 Silence or soft noise only\nYour brain continues to scan for sound even when you're asleep. Random noises — like traffic, roommates, or TV in the next room — can increase sleep interruptions. (Sleep Foundation) Try earplugs, white noise, or a fan to mask sound.",

        "🚫 Use your bed only for sleep\nLying in bed while scrolling or stressing teaches your brain that the bed is for being awake — not for sleep. If you're not sleepy, leave the bed and return when you are. (Cognitive Behavioral Therapy for Insomnia — CBT-I guideline)",

        "✅ Checklist for your cave:\n- Blackout curtains or sleep mask\n- Cool temperature — no heavy blankets if you're overheating\n- Soft white noise or silence\n- Zero glowing lights\n- Bed = sleep only",

        "📲 Share This\nIf someone keeps waking up at 3AM for no reason — it's probably their room. Send them this. Their cave needs fixing.",

        "Sleep isn't just about your body. It's about your environment. Set it up once — and sleep better every night."
      ],
      shareable: true
    },
    '8': {
      id: '8',
      title: 'Should You Take Sleep Pills?',
      icon: 'medical-outline',
      color: '#FF2D55',
      content: [
        "💊 Should You Take Sleep Pills?",

        "Short answer? Probably not. Even though it's a multi-billion dollar industry, sleep pills usually don't give you real sleep — they just sedate your brain. There's a difference.",

        "🧠 What most people don't know\nPrescription sleep meds (like Ambien) knock you out, but they don't help you reach deep, natural sleep. You might be unconscious, but your brain isn't doing the full reset it needs. (Matthew Walker, PhD — Why We Sleep)",

        "💸 This is big business\nThe global sleeping pill market is worth over $60 billion. It's built on the idea that your body is broken and needs a pill to rest. But for most people, fixing your light exposure, routine, and stress works better — and actually gives you real rest.",

        "⚠️ Side effects are real\nPills can cause next-day grogginess, memory issues, dependency, or worse. Some studies have even linked long-term use to increased risk of depression and early death. (BMJ, 2012)",

        "😴 What about melatonin gummies?\nMelatonin helps some people, but timing and dosage matter a lot. Most gummies are poorly regulated — you could be getting 2x or 5x the dose on the label. Use only if you're shifting time zones or fixing jet lag. Not for nightly use. (Sleep Foundation)",

        "💬 We're not saying this to go viral. We might even get attacked for it — because this is the stuff billion-dollar brands don't want you to know.",

        "📲 Share This\nKnow someone who's been relying on pills instead of fixing their habits? Share this with them. They deserve real sleep, not just sedation.",

        "Your brain already knows how to sleep. It just needs the right support — not another bottle."
      ],
      shareable: true
    },
    '9': {
      id: '9',
      title: 'Food, Caffeine, and Sleep',
      icon: 'cafe-outline',
      color: '#FF9500',
      content: [
        "🍽 Food, Caffeine, and Sleep",

        "What you eat — and *when* — plays a bigger role in sleep than most people realize. You don't need a perfect diet. You just need to stop sabotaging yourself at night.",

        "☕️ The caffeine trap\nCaffeine blocks adenosine — the chemical that makes you feel sleepy. Even if you fall asleep after caffeine, your brain won't go as deep. You'll wake up groggier, not more rested. (Sleep Foundation)",

        "😮 Hidden caffeine alert:\nIt's not just coffee. Caffeine is also in:\n- Green and black tea ☕️ (yes, even 'relaxing' tea!)\n- Chocolate 🍫 (especially dark)\n- Soda 🥤 and energy drinks\n- Pre-workout and painkillers (like Excedrin)",

        "🕒 Caffeine lasts longer than you think\nIts half-life is 5–6 hours, but it can stay in your system for up to **10 hours**. That 4PM iced latte? It's still affecting your brain at midnight.",

        "🍔 Heavy meals late at night\nEating greasy or spicy food close to bedtime raises your body temp, spikes digestion, and can cause acid reflux. All of it keeps your system too busy to sleep well.",

        "🍫 Sugar = mid-night wakeups\nQuick sugar spikes can cause adrenaline dumps and blood sugar crashes. That can jolt you awake at 2–3AM. Try light snacks with protein or healthy fat instead — like yogurt, banana + almond butter, or nuts.",

        "🫖 Better bedtime options:\n- Herbal tea with **no caffeine** (like chamomile, lemon balm, rooibos)\n- Tart cherry juice (a natural source of melatonin)\n- Water — just don't chug it right before bed",

        "⚠️ Quick fix list:\n- Cut caffeine 8–10 hours before sleep\n- Stop eating 2–3 hours before bed\n- Avoid sugar bombs, soda, chocolate, and energy bars in the evening",

        "📲 Share This\nMost people say they don't drink coffee late — but still sip green tea or eat dark chocolate at night. Help someone fix their sleep without giving up everything they love.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Sleep starts in your stomach. Eat smarter, sleep deeper."
      ],
      shareable: true
    },
    '10': {
      id: '10',
      title: 'Sleep Myths That Mess You Up',
      icon: 'alert-circle-outline',
      color: '#BF5AF2',
      content: [
        "🌀 Sleep Myths That Mess You Up",

        "There's a lot of bad advice out there — and some of it sounds totally believable. But these sleep myths are wrecking people's routines every night.",

        "❌ Myth 1: Everyone needs 8 hours\nSome people need 7. Others need 9. The real goal is waking up feeling rested and clear — not chasing a number. (Sleep Foundation)",

        "❌ Myth 2: You can 'catch up' on weekends\nSleeping in for 3 extra hours on Saturday just confuses your body clock. It's called 'social jet lag' — and it makes Sunday night even harder. (Harvard Health)",

        "❌ Myth 3: Alcohol helps you sleep\nIt knocks you out, but it blocks REM sleep and leads to more wake-ups during the night. That's not real rest. (National Sleep Foundation)",

        "❌ Myth 4: Watching TV helps you wind down\nScreens (especially bright ones) reduce melatonin and stimulate your brain. You might feel relaxed, but your sleep quality takes a hit. (NIH, 2022)",

        "❌ Myth 5: If you can't sleep, stay in bed\nLying in bed awake teaches your brain that the bed is for overthinking. If you can't sleep after 20–30 minutes, get up and do something calming in dim light. (CBT-I guidelines)",

        "❌ Myth 6: Older people need less sleep\nSleep needs don't change much with age — but older adults may have a harder time staying asleep. Quality matters more than quantity. (CDC)",

        "✅ Truth: The best sleep isn't about hacks or shortcuts — it's about rhythm, light, and consistency.",

        "📲 Share This\nYou probably know someone who swears by one of these myths — and still wakes up tired. Send them this and help them sleep smarter.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Fixing sleep starts by unlearning what's wrong. Then you can build what actually works."
      ],
      shareable: true
    },
    '11': {
      id: '11',
      title: 'Naps — Good or Bad?',
      icon: 'time-outline',
      color: '#34C759',
      content: [
        "🛌 Naps — Good or Bad?",

        "Naps can be your secret weapon — or your sleep destroyer. It all depends on when you nap, how long you nap, and why you're napping in the first place.",

        "✅ When naps are good:\n- You didn't sleep well the night before\n- You need a quick energy boost\n- You're a student, shift worker, or jet-lagged traveler\n- You keep them short and early in the day\n(Sleep Foundation, 2021)",

        "⚠️ When naps mess you up:\n- You nap too late in the day (after 3–4PM)\n- You nap for too long (over 30 minutes)\n- You wake up groggy and disoriented — this is called 'sleep inertia' and can last up to 60 minutes (NIH)\n- You have trouble falling asleep at night (especially if you're sensitive to sleep pressure)",

        "⏱ The perfect nap:\n10–20 minutes gives you a quick boost in alertness, mood, and performance, without entering deep sleep (NASA nap study, 1995)\n90 minutes can work if you want a full sleep cycle, but only if you can wake up naturally and not groggy",

        "🕓 Nap timing matters\nNapping too late in the day interferes with your natural circadian rhythm and melatonin production. It can push your bedtime later without you realizing it. (Harvard Sleep Medicine Division)",

        "💤 Pro tip:\nIf you're craving naps every day, you might not be getting enough quality sleep at night. Fix your nighttime habits first — naps should be a bonus, not a survival strategy.",

        "📲 Share This\nKnow someone who takes random naps every day but still can't sleep at night? Send this to them. They might be making it worse without realizing it.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Use naps wisely. When done right, they recharge your brain. When done wrong, they confuse your sleep clock."
      ],
      shareable: true
    },
    '12': {
      id: '12',
      title: 'Move to Sleep Better',
      icon: 'walk-outline',
      color: '#FF9500',
      content: [
        "🏃‍♂️ Move to Sleep Better",

        "You don't need a perfect workout routine to sleep well — but your body was built to move. And when you don't move enough during the day, your brain has a harder time powering down at night.",

        "💤 Daily movement builds better sleep\nExercise helps reduce stress hormones like cortisol and boosts melatonin — the hormone that helps you fall asleep. People who move more sleep faster, deeper, and wake up less during the night. (Johns Hopkins Medicine)",

        "🚶 Why walking is underrated\nA 20–30 minute walk a day can improve sleep quality, lower anxiety, and help regulate your body clock. It's also one of the best forms of cardio for fat loss — low stress, sustainable, and good for your brain.",

        "🌆 Move in the evening to wind down\nLight movement in the evening — like stretching, walking, or gentle yoga — helps your body transition from high-alert to rest mode. It tells your brain, 'We're done for the day.'",

        "⚠️ But don't overdo it\nHigh-intensity workouts too close to bed can raise your body temperature and stress hormones — making it harder to fall asleep. Try to finish intense training at least 2–3 hours before bed.",

        "✅ Quick tips:\n- Get at least 20–30 minutes of movement a day\n- Walk outside in the morning or afternoon for a circadian rhythm boost\n- In the evening, keep movement light and relaxing — no maxing out on squats before sleep",

        "📲 Share This\nKnow someone who never moves but complains about bad sleep? Send this to them. They don't need a new mattress — they just need to go for a walk.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Move during the day. Slow down at night. Sleep deeper. Wake up better."
      ],
      shareable: true
    },
    '13': {
      id: '13',
      title: "What's Up with Dreams?",
      icon: 'cloudy-night-outline',
      color: '#5856D6',
      content: [
        "🌌 What's Up with Dreams?",

        "Dreams aren't random. They're not just weird movies your brain plays while you're knocked out. They're part of your brain's cleanup crew — sorting, organizing, and healing behind the scenes.",

        "🧠 Why we dream (yes, science actually has answers)\nDuring REM sleep (the deepest stage), your brain processes emotional memories, handles stress, and connects ideas in creative ways. People who get more REM sleep are better at problem-solving, mood regulation, and even learning. (Harvard Medical School)",

        "🎨 Dreams make you more creative\nYour brain mixes memories, emotions, and random ideas — like remixing reality. This is why many musicians, writers, and inventors get ideas from dreams. (Scientific American, 2010)",

        "❤️ Dreams help you heal emotionally\nStudies show that dreaming softens painful memories by 'replaying' them without the stress chemicals present during the day. It's like exposure therapy while you sleep. (UC Berkeley, 2017)",

        "🪞 Most people don't remember their dreams\nThat's normal. It doesn't mean you're not dreaming — you are. You just wake up outside of a REM cycle. But if you wake naturally or write them down right away, you can train your brain to recall them.",

        "🕵️ What if you never dream?\nYou probably do — but if you sleep poorly, especially with disrupted REM, your brain might not be spending enough time in the deep dream phase.",

        "📲 Share This\nDreams are free therapy, creativity boosters, and emotional reset buttons. If someone you know always says 'dreams are pointless,' send them this.",

        "Take your dreams seriously. Your brain does."
      ],
      shareable: true
    },
    '14': {
      id: '14',
      title: 'Sleep & Mental Health',
      icon: 'heart-outline',
      color: '#FF2D55',
      content: [
        "🧠 Sleep & Mental Health",

        "If your sleep is a mess, your mental health will be too. It works both ways. The worse you sleep, the harder it is to think clearly, stay calm, or feel good — even if nothing's technically wrong.",

        "💔 A new way to heal\nThey say 'time heals everything,' but here's the truth: **sleep heals faster.** Researchers found that REM sleep helps your brain process emotional pain by calming the sting of painful memories — like a form of overnight therapy. (UC Berkeley, 2017)",

        "So if you're dealing with heartbreak, loss, or deep stress… don't wait for time to fix it. Prioritize sleep. That's where the real healing happens.",

        "😵 Sleep loss makes everything feel worse\nEven one bad night can raise anxiety by up to 30%. (UC Berkeley, 2019) Sleep-deprived brains have stronger reactions to fear and stress, and less control over mood and focus.",

        "🥀 Long-term sleep issues = higher risk of:\n- Depression\n- Generalized anxiety disorder\n- ADHD-like symptoms\n- Burnout and emotional exhaustion\n(Sleep Foundation, National Institutes of Health)",

        "💬 You're not weak — you're tired\nA lot of what feels like 'laziness' or 'lack of willpower' is actually just brain fog and emotional fatigue from poor sleep. When your brain is rested, everything feels more doable.",

        "🧘 Better sleep = better coping\nSleep strengthens your emotional regulation. It gives you pause before panic. It makes you more emotionally stable, less reactive, and more hopeful — all by default.",

        "❤️ Quick mental health checklist:\n- Prioritize sleep like your mind depends on it (because it does)\n- Cut late-night scrolling — it fuels anxiety\n- Stick to a consistent wake-up time\n- Build a wind-down routine that actually calms you",

        "📲 Share This\nIf someone you care about is heartbroken, stressed, or spiraling — don't just tell them 'it gets better.' Send them this. Remind them to sleep. That's where healing starts.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Let your brain rest. Let your heart repair. Sleep heals what time alone cannot."
      ],
      shareable: true
    },
    '15': {
      id: '15',
      title: 'Sleep & Muscle Growth',
      icon: 'fitness-outline',
      color: '#34C759',
      content: [
        "💪 Sleep & Muscle Growth",

        "If you're working out but not sleeping well, you're wasting your time in the gym. Sleep is when your body actually builds muscle — not when you're lifting.",

        "🏋️ The science is clear\nMuscle growth happens during sleep, not during exercise. Exercise creates micro-tears in muscle fibers, but it's during deep sleep that your body releases growth hormone to repair and strengthen those fibers. (Journal of Clinical Endocrinology & Metabolism)",

        "⚠️ Poor sleep = muscle loss\nJust one week of bad sleep can reduce testosterone by 10-15% in healthy men. Low testosterone means less muscle growth and more fat storage. (University of Chicago study)",

        "🔄 Recovery needs sleep\nWithout enough deep sleep, your muscles can't fully recover between workouts. This leads to increased injury risk, decreased strength, and plateaus in your progress. (International Journal of Sports Medicine)",

        "🧪 Sleep affects your hormones\nSleep deprivation increases cortisol (stress hormone) and decreases testosterone and growth hormone — the exact opposite of what you want for building muscle. (Sports Medicine)",

        "🥩 Protein timing matters less than sleep\nMany people obsess over protein timing but ignore sleep. The truth? You can have the perfect diet and training program, but without adequate sleep, your results will always be limited. (European Journal of Sport Science)",

        "✅ How to maximize muscle growth:\n- Aim for 7-9 hours of quality sleep every night\n- Keep a consistent sleep schedule (even on weekends)\n- Sleep in a cool, dark room\n- Avoid caffeine after 2PM\n- Consider a 20-minute power nap after workouts",

        "📲 Share This\nKnow someone who spends hours in the gym but complains about slow progress? Send them this. They might be sabotaging their gains without realizing it.",

        "Train hard. Eat well. But above all, sleep deep. That's where the real gains happen."
      ],
      shareable: true
    },
    '16': {
      id: '16',
      title: 'Sleep & Immunity',
      icon: 'shield-outline',
      color: '#5856D6',
      content: [
        "🛡️ Sleep & Immunity",

        "If you're always getting sick, run-down, or can't shake colds — your sleep might be the problem. Your immune system doesn't just rest while you sleep. It trains, rebuilds, and resets.",

        "🦠 Sleep is when your immune system does its best work\nDeep sleep triggers the release of infection-fighting proteins called cytokines. Without enough sleep, your body makes fewer of them — which weakens your defense system. (NIH)",

        "🤧 People who sleep less than 6 hours are 4x more likely to catch a cold\nThat's not a typo. In one study, people who slept less than 6 hours per night were way more likely to get sick after virus exposure. (Cohen et al., 2009 — JAMA Internal Medicine)",

        "💉 Sleep even affects how well vaccines work\nSleep-deprived people have lower antibody responses — meaning vaccines are less effective if you're sleep-deprived. (University of Chicago, 2002)",

        "🔥 Poor sleep = chronic inflammation\nOngoing sleep debt increases cortisol and inflammatory chemicals in the body. That's linked to everything from heart disease to autoimmune issues. (CDC, Sleep Foundation)",

        "✅ How to support your immune system naturally:\n- Aim for 7–9 hours of quality sleep per night\n- Go to bed and wake up at the same time daily\n- Avoid alcohol and late-night meals when you're feeling run-down",

        "📲 Share This\nKnow someone who's always sick or struggling with burnout? They might not need more meds — they might need deeper sleep. Send this their way.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Your immune system works harder than you know. Give it the recovery time it needs — every night."
      ],
      shareable: true
    },
    '17': {
      id: '17',
      title: 'Sleep & Beauty',
      icon: 'sparkles-outline',
      color: '#FF9500',
      content: [
        "💅 Sleep & Beauty",

        "Beauty sleep is real. And the difference shows — on your skin, your face, and your entire vibe. Every night is a chance to glow up — or fall apart.",

        "💤 Your skin repairs while you sleep\nDeep sleep boosts collagen, reduces inflammation, and increases blood flow to your skin. This helps heal damage and gives you that natural glow. (Sleep Foundation)",

        "👁 Puffy eyes, dull skin, breakouts\nWhen you're sleep-deprived, cortisol (your stress hormone) rises. This breaks down collagen, slows healing, and increases breakouts, bags, and uneven tone. (NIH)",

        "🧬 Sleep slows aging\nYour body produces growth hormone during deep sleep — it helps repair skin, muscles, and hair. Less sleep = faster aging. (Journal of Clinical Endocrinology & Metabolism)",

        "📸 The study that says it all\nResearchers in Sweden took photos of people after a full night of sleep and after being sleep-deprived. Then they showed those photos to strangers. The verdict? People who were well-rested were rated as significantly **more attractive, healthier, and more approachable**. The tired versions — not so much. (BMJ, 2010)",

        "✨ Want to glow up? Sleep more\nSkincare helps. Hydration helps. But none of it matters if you're sleeping like trash. Your face tells the truth.",

        "📲 Share This\nKnow someone who's all about skincare but stays up scrolling till 3AM? Send them this. Sleep is the glow-up they're missing.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "You don't need a $200 serum. You need consistent sleep. Tonight is your beauty reset."
      ],
      shareable: true
    },
    '18': {
      id: '18',
      title: 'Sleep & Longevity',
      icon: 'hourglass-outline',
      color: '#FF2D55',
      content: [
        "⏳ Sleep & Longevity",

        "Sleep isn't just about how you feel tomorrow. It's about how long you'll be here — and how well you'll live while you are.",

        "⚠️ Poor sleep is linked to early death\nMultiple studies have found that people who consistently sleep less than 6 hours per night have a **20–48% higher risk of dying early** from any cause. (Sleep Foundation, CDC)",

        "🫀 Chronic sleep loss increases disease risk\nLack of sleep raises your chances of:\n- Heart disease\n- Stroke\n- Type 2 diabetes\n- Alzheimer's and dementia\n- Obesity and certain cancers\n(CDC, NIH)",

        "🧠 Your brain ages faster with poor sleep\nSleep is when your brain clears out waste, resets memory, and repairs cells. Without it, the aging process speeds up — mentally and physically. (National Institute on Aging)",

        "😴 Sleeping too much isn't the answer either\nPeople who regularly sleep more than 9–10 hours also show higher risk of health problems. It's not about more — it's about quality and rhythm.",

        "🕰 The sweet spot for most people:\n7–9 hours of consistent, good-quality sleep every night. That's the zone where your body repairs, your immune system strengthens, and your risk of disease drops.",

        "📲 Share This\nKnow someone who brags about 'running on 4 hours of sleep'? They're not just tired — they're aging faster. Send them this before they burn out for good.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "If you want to live longer, think clearer, and feel better — start by sleeping better. Longevity starts with lights out."
      ],
      shareable: true
    },
    '19': {
      id: '19',
      title: 'Sleep & Weight Loss',
      icon: 'scale-outline',
      color: '#4CD964',
      content: [
        "⚖️ Sleep & Weight Loss",

        "If you're trying to lose weight but ignoring sleep, you're fighting an uphill battle. Sleep affects every hormone that controls hunger, cravings, and metabolism.",

        "🍪 Poor sleep = more hunger\nJust one night of bad sleep increases ghrelin (your hunger hormone) and decreases leptin (your fullness hormone). This makes you hungrier all day and less satisfied after meals. (University of Chicago)",

        "🧠 Sleep loss hijacks your food choices\nSleep-deprived brains show increased activity in reward centers when shown unhealthy foods. Your willpower drops, and you crave more sugar, salt, and fat. (UC Berkeley, 2013)",

        "🔥 Metabolism slows down\nPoor sleep reduces your resting metabolic rate and makes your body more likely to store calories as fat rather than burn them for energy. (American Journal of Clinical Nutrition)",

        "⏱️ The numbers are shocking\nStudies show that people who sleep 5-6 hours eat 300+ more calories per day than those who sleep 7-9 hours. That's an extra pound of weight gain every 12 days. (Mayo Clinic)",

        "💪 Muscle loss, not fat loss\nWhen you're sleep-deprived and cutting calories, up to 70% of the weight you lose comes from muscle, not fat. With proper sleep, that ratio improves dramatically. (Annals of Internal Medicine)",

        "✅ Sleep-based weight loss tips:\n- Aim for 7-8 hours of quality sleep every night\n- Keep a consistent sleep/wake schedule\n- Get morning sunlight to regulate hunger hormones\n- Avoid late-night eating (especially carbs and sugar)\n- Sleep in a cool room (65-68°F) to boost metabolism",

        "📲 Share This\nKnow someone who's trying every diet but can't lose weight? Send them this. Their sleep might be the missing piece.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Fix your sleep first. Then watch your weight respond."
      ],
      shareable: true
    },
    '20': {
      id: '20',
      title: 'Sleep for Kids & Students',
      icon: 'school-outline',
      color: '#AF52DE',
      content: [
        "👶 Sleep for Kids & Students",

        "Sleep isn't just 'rest' for children and students — it's when their brains develop, memories form, and emotional regulation builds. Missing sleep during these critical years has consequences that can last a lifetime.",

        "🧠 Sleep builds the growing brain\nChildren's brains form millions of neural connections during sleep. These connections are essential for learning, memory, and cognitive development. Just one hour less sleep per night can lower academic performance by two grade levels. (NIH, American Academy of Pediatrics)",

        "📏 Growth happens during deep sleep\nGrowth hormone is released primarily during deep sleep cycles. Consistent sleep deprivation can literally stunt a child's physical development and immune system strength. (Journal of Pediatrics)",

        "😡 Behavior problems aren't just 'bad kids'\nSleep-deprived children are 50-100% more likely to have behavior problems, ADHD-like symptoms, and emotional regulation issues. What looks like defiance or hyperactivity is often just exhaustion. (Sleep Medicine Reviews)",

        "📚 Memory consolidation happens at night\nStudents who sleep 8+ hours after studying retain 20-40% more information than those who cut sleep short. Pulling all-nighters is literally throwing away hours of study time. (Current Biology, 2019)",

        "⏰ How much sleep do they really need?\n- Toddlers (1-2 years): 11-14 hours\n- Preschoolers (3-5): 10-13 hours\n- School age (6-12): 9-12 hours\n- Teens (13-18): 8-10 hours\n- College students: 7-9 hours\n(American Academy of Sleep Medicine)",

        "🚨 Warning signs of sleep deprivation in kids:\n- Falling asleep in car rides or at school\n- Hyperactivity and inability to focus\n- Emotional meltdowns and irritability\n- Difficulty waking up in the morning\n- Declining grades or sports performance",

        "✅ How to help kids and students sleep better:\n- Consistent bedtime (even on weekends)\n- No screens 1 hour before bed (blue light blocks melatonin)\n- Cool, dark bedroom environment\n- Regular physical activity during the day\n- Limit caffeine (including sodas and chocolate)",

        "📲 Share This\nIf you know parents struggling with a child's behavior, or students falling behind academically — send them this. Sleep might be the missing piece that changes everything.",

        "💤 And if you want to take control of your own sleep?\nBlissAlarm app has helped 100,000 people get better sleep with calming sounds, smart alarms, and nighttime app blocking—everything you need to finally rest right.",

        "Sleep isn't optional for developing brains. It's the foundation everything else is built on."
      ],
      shareable: true
    },
    // Add more tutorial content for other IDs
  };
  
  const tutorial = tutorialContents[id as string];
  
  const handleShare = async () => {
    if (!tutorial) return;
    
    try {
      // Format content for sharing
      const shareContent = tutorial.content.join('\n\n');
      const message = `${tutorial.title}\n\n${shareContent}\n\nShared from Bliss Alarm`;
      
      await Share.share({
        message,
        // On iOS, you can also specify a URL
        ...(Platform.OS === 'ios' ? { url: 'https://blissalarm.app' } : {})
      });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };
  
  if (!tutorial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backButtonOnly}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Tutorial not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* This Stack component with headerShown: false ensures no header is displayed */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.backButtonOnly}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {tutorial.shareable && (
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.iconContainer, { backgroundColor: tutorial.color }]}>
            <Ionicons name={tutorial.icon as any} size={40} color="#FFFFFF" />
          </View>
          
          <Text style={styles.titleText}>{tutorial.title}</Text>
          
          {tutorial.content.map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
        
        {/* Sticky share button for blocks 2-20 */}
        {tutorial.shareable && (tutorial.id === '2' || tutorial.id === '3' || tutorial.id === '4' || tutorial.id === '5' || tutorial.id === '6' || tutorial.id === '7' || tutorial.id === '8' || tutorial.id === '9' || tutorial.id === '10' || tutorial.id === '11' || tutorial.id === '12' || tutorial.id === '13' || tutorial.id === '14' || tutorial.id === '15' || tutorial.id === '16' || tutorial.id === '17' || tutorial.id === '18' || tutorial.id === '19' || tutorial.id === '20') && (
          <View style={styles.stickyButtonContainer}>
            <TouchableOpacity 
              style={styles.stickyShareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share these tips</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backButtonOnly: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding at bottom to account for sticky button
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  bottomPadding: {
    height: 20,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  stickyShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  }
}); 