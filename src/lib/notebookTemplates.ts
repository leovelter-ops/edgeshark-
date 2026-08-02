export type NotebookCategory =
  | "Performance Review"
  | "Mindset"
  | "Productivity"
  | "Playbook";

export interface TemplateDef {
  id: string;
  name: string;
  emoji: string;
  category: NotebookCategory;
  body: string;
}

export const CATEGORY_META: { name: NotebookCategory; emoji: string }[] = [
  { name: "Performance Review", emoji: "📊" },
  { name: "Mindset", emoji: "🔥" },
  { name: "Productivity", emoji: "🧠" },
  { name: "Playbook", emoji: "📘" },
];

export const TEMPLATES: TemplateDef[] = [
  // ---------------- Performance Review ----------------
  {
    id: "daily-review",
    name: "Daily Review",
    emoji: "📒",
    category: "Performance Review",
    body: `Date:
Session: Asia / London / New York
Market: Trending / Ranging / Choppy / News-driven

# Summary Statistics
Wins:
Losses:
Breakeven:
Total Trades:
Win Rate (%):
Net P/L:
Net (R):
Max Drawdown (R):
Rule Breaks (#):

# ✅ Execution Check
Did I follow my plan today?:
A+ setups taken:
Impulse/FOMO trades:
Missed valid setups:
Best trade today:
Worst trade today:

# 🧠 Daily Reflection
What was the main mistake I made today?
What did I do well today?
What emotion affected my trading the most?
What is the one lesson from today?

# 🎯 Tomorrow's Focus
One thing I will repeat:
One thing I will stop doing:
One rule I will follow no matter what:`,
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    emoji: "📅",
    category: "Performance Review",
    body: `Week of [INSERT DATE RANGE]

# Summary Statistics
Wins:
Losses:
Breakeven:
Total Trades:
Win Rate (%):
Net P/L:
Net (R):
Avg Win (R):
Avg Loss (R):
Max Drawdown (R):
Rule Breaks (#):

# Quick Process Check
Plan-follow rate (%):
A+ setups taken (#):
FOMO / impulse trades (#):
Missed valid setups (#):
Best trade (why it was good):
Worst trade (what caused it):

# 🔍 Reflection Prompts
What went well this week, and what specifically made it work?
What mistakes or weak points showed up, and what's the prevention plan?
What pattern do you notice in your best vs worst trades?
What's your single focus going into next week?`,
  },
  {
    id: "monthly-review",
    name: "Monthly Review",
    emoji: "🗓️",
    category: "Performance Review",
    body: `Month YYYY

# Summary Statistics
Wins:
Losses:
Breakeven:
Total Trades:
Win Rate (%):
Net P/L:
Net (R):
Avg Win (R):
Avg Loss (R):
Profit Factor:
Max Drawdown:

# Process Score
Plan-follow rate (%):
Rule breaks (#):
Overtrades (#):
Best day (what you did right):
Worst day (what went wrong):

# 🧠 Reflection Questions
What's the #1 trading lesson that hit hardest this month?
What mental barrier showed up most, and what's your plan to fix it?
What are you most proud of this month (process or results)?
What's your single focus going into next month?`,
  },
  {
    id: "quarterly-review",
    name: "Quarterly Review",
    emoji: "📁",
    category: "Performance Review",
    body: `Q1/Q2/Q3/Q4 YYYY

# Summary Statistics
Wins:
Losses:
Breakeven:
Total Trades:
Win Rate (%):
Net P/L:
Net (R):
Avg Win (R):
Avg Loss (R):
Profit Factor:
Max Drawdown:
Biggest Win (R):
Biggest Loss (R):
Rule Breaks (#):
Plan-follow rate (%):

# Performance Breakdown
Best market/pair:
Worst market/pair:
Best session/time window:
Worst session/time window:
Best setup (name + why):
Worst setup (name + why):
Top 1–2 mistakes that cost you most (in R):

# Process Audit
Biggest execution upgrade this quarter:
Biggest discipline upgrade this quarter:
Biggest mistake pattern to eliminate next quarter:

# 🧠 Deep Reflection
What was your biggest breakthrough this quarter?
Where did you slip most, and what's the fix?
What was your toughest moment, and what did it teach you?
If you master ONE thing next quarter, what is it?`,
  },
  {
    id: "annual-review",
    name: "Annual Review",
    emoji: "💼",
    category: "Performance Review",
    body: `YYYY

# Summary Statistics
Wins:
Losses:
Breakeven:
Total Trades:
Win Rate (%):
Net P/L:
Net (R):
Profit Factor:
Max Drawdown:
Biggest Win (R):
Biggest Loss (R):

# Year Snapshot
- Most Active Month:
- Best Month (why it worked):
- Most Challenging Month (what broke down):
- Most Profitable Setup:
- Most Costly Mistake Pattern:
- Plan-follow rate (%):
- Rule Breaks (#):

# 🧠 Deep-Dive Reflection
What were the 3 most powerful lessons you learned as a trader this year?
1. .....
2. .....
3. .....
What habits, systems, or mental shifts contributed most to your growth?
- List
What setbacks or patterns kept repeating — and what will you change moving forward?
- List
What was your proudest trading moment of the year and why?
- List
What part of your strategy still needs development or refinement?
- List
What would make next year your best trading year yet — and how will you engineer it?
- List`,
  },

  // ---------------- Mindset ----------------
  {
    id: "macro-trade-journal",
    name: "Macro Trade Journal Template",
    emoji: "📓",
    category: "Mindset",
    body: `# 📅 Date

# ⚙️ Trade Setup
Describe the strategy you used (e.g., "Liquidity Sweep + Reclaim", "Breakout Retest", "Supply Zone Rejection")

# 📰 News Catalyst (if any)
Was there major news that day? Example:
- CPI (USD) – came in hotter than expected
- FOMC speech – market waiting for Powell
- No major catalyst

# 📈 4. Rate Cycle Phase
Select one:
- Hike 📈
- Pause ✋
- Cut ⬇️
- QE 🖨️

# 🌍 5. Risk Sentiment
What was the broader market tone?
- Risk-On 🔥 (e.g. SPX rising, DXY falling, Gold down)
- Risk-Off 🛡️ (e.g. SPX weak, USD/JPY dropping, Gold spiking)

# 💡 6. What Went Right
Quick reflection on what you executed well (e.g., "waited for confirmation post-news", "respected structure")

# ❌ 7. What Went Wrong
Honest review of mistakes (e.g., "entered before news", "ignored macro headwind", "overleveraged")

# 🧠 8. Emotional Notes / Mindset
What were you feeling/thinking during the trade? E.g., "Felt FOMO during the spike but sat out," "Confident after structure reclaim," "Tilted after last loss."

# 🖼 9. Chart Screenshot
Paste or link a screenshot of the trade idea (entry/exit marked).
@img

# 🔁 10. Would You Take This Trade Again?
Yes or no? If No — why not? What would need to be different next time?`,
  },
  {
    id: "pre-market-mental-prep",
    name: "Pre-Market Mental Prep",
    emoji: "🧘",
    category: "Mindset",
    body: `# 📅 Date

# 🛌 Sleep Score (1–10)
How well-rested do you feel?
Type number or short sentence

# ⚡ Energy Level (1–10)
Mental clarity, alertness, and focus.
Type number or short sentence
-

# 😶 Emotional State
What emotion are you bringing into the session?
- Calm
- Focused
- Anxious

# 🧠 Mental Noise
Is anything distracting or pulling your focus today?

# 💬 Inner Dialogue
What are you telling yourself about today's trading?
Example: "Today, I'll trade my plan, not my feelings."

# 🧭 Session Intention
What is your 1 clear goal for today's session?

# 🧘 Reset Trigger (if emotions spike)
What will you do if you feel tilted?
- Step away for 5 minutes
- Review trading rules
- Breathe for 60 seconds`,
  },
  {
    id: "post-trade-reflection",
    name: "Post-Trade Reflection",
    emoji: "🪞",
    category: "Mindset",
    body: `# 📅 Date

# 💱 Pair & Direction
- Pair:
- Buy/Sell:

# 🎯 Setup / Strategy Used
What system or model was this trade based on?

# ✅ Trade Outcome
Outcome: Win/Loss/Breakeven
R-multiple:________
Net P/L:________

# 📉 Mistakes (if any)
[] Early entry
[] Late entry
[] Exit too early
[] Moved SL or TP
[] Didn't follow plan
[] Emotional decision
[] Overleveraged

# 😵‍💫 Emotion Check
How did you feel
Before the trade:
During the trade:
After the trade:

# 💬 Self-Talk
What were you telling yourself during the trade?

# 🔍 Review Snapshot
What did I do well?
What needs improvement?

# 📌 Final Reflection
Biggest lesson from this trade:
What I'll do differently next time:`,
  },
  {
    id: "emotional-mapping-journal",
    name: "Emotional Mapping Journal",
    emoji: "🌐",
    category: "Mindset",
    body: `# 🔥 Trigger
What pushed you to take the trade?
Examples:
- Price reversed at a key level
- FOMO after missing 3 setups
- Impulse to make back losses
- External stress (e.g. tired, distracted)

# 💭 Thought Before Entry
What were you thinking right before you entered?
- "It's reversing now, I have to get in before it's too late."
- "This looks like the perfect setup — it has to win."

# 😵 Emotion (Before / During / After)
How did you feel before, during, and after the trade?
- Fear
- Impatience
- Greed
- Anger / Revenge
- Hope
- Confidence → Notes: ______________

# 👣 Behavior
What did you do with the trade?
- Scaled in
- Scaled out early
- Moved SL or TP
- Took poor entry / exit

# 🧍 In-Trade Action
What were you doing while the trade was active?
- Checked PnL constantly
- Couldn't sit still
- Overanalyzing

# 🔁 Deviations
Did you change your plan mid-trade? What changed and why?
- Yes, I did because price was reversing near my take profit…

# 🧠 Market Perception
Did you see the market clearly — or project your bias?
- No, I though to myself: "This is the reversal — it has to be."

# ⚠️ Mistakes Logged
What mistake(s) did you commit?
- Revenge traded
- Overtraded
- Ignored confirmation
- Forced a reversal
- Skipped top-down

# 📌 Final Reflection
What's the biggest thing I learned from this trade? What will I do differently next time?
"I jumped in just because I missed two clean setups earlier. I wasn't trading my system — I was trading my frustration. The trade wasn't even in my kill zone. Next time, I'll take a walk after a missed opportunity instead of forcing something."`,
  },

  // ---------------- Productivity ----------------
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    emoji: "📝",
    category: "Productivity",
    body: `|  | Mon | Tues | Wed | Thurs | Fri | Sat | Sun
| 🧘 Meditate | ✅ |  |  |  |  |  |
| 🏋️ Workout |  | ✅ |  |  |  |  |
| 🍽️ Eat Clean |  |  |  |  | ✅ |  |
| 📖 Study Trading |  |  | ✅ |  |  |  |
| 📈 Chart Analysis |  |  |  |  |  | ✅ |
| 🧍 Follow Mechanical Plan |  | ✅ |  | ✅ |  |  |
| 📓 Journal Trades |  |  |  |  |  |  |`,
  },
  {
    id: "daily-planner",
    name: "Daily Planner",
    emoji: "📅",
    category: "Productivity",
    body: `Date:

| Time | Activity | Time | Activity
| 0700 |  | 1430 |
| 0730 |  | 1500 |
| 0800 |  | 1530 |
| 0830 |  | 1600 |
| 0900 |  | 1630 |
| 0930 |  | 1700 |
| 1000 |  | 1730 |
| 1030 |  | 1800 |
| 1100 |  | 1830 |
| 1130 |  | 1900 |
| 1200 |  | 1930 |
| 1230 |  | 2000 |
| 1300 |  | 2030 |
| 1330 |  | 2130 |
| 1400 |  | 2200 |

# 🙏 I'm grateful for:
1. List
2. List
3. List

# 🎯 To Do:
[] Backtest Entry Model #3
- []
- []

# 🏆 Today's Wins:
- List

# 💪 How can I improve tomorrow?
1. List
2. List
3. List`,
  },
  {
    id: "daily-routine-checklist",
    name: "Daily Routine Checklist",
    emoji: "✅",
    category: "Productivity",
    body: `# 🌅 Morning Routine
[] No phone for the first 30 minutes
[] 5–10 minutes of breathwork or meditation
[] Set 1 clear intention for the day

# 📊 Pre-Market Routine
[] Complete Pre-Market Mental Prep
[] Review Trade Plan + Watchlist
[] Check economic calendar for high-impact news

# 🎯 Trading Session Rules
[] Only take trades that match your A+ setup
[] Stick to 1% risk per trade, max 3R daily loss
[] Use Execution tab before every entry

# 🌙 Post-Market Routine
[] Log all trades in the Journal
[] Complete Post-Trade Reflection
[] Disconnect from charts and do 1 thing to decompress`,
  },
  {
    id: "goal-tracker",
    name: "Goal Tracker",
    emoji: "🎯",
    category: "Productivity",
    body: `# 📌 Top 3 Goals (This Month)
| Goal | Why It Matters | Deadline | Status
| e.g. Pass $50K Challenge | To gain more capital and pressure-test my system | July 31 | 🔄 In Progress
| Goal 2 | ... | ... | ...
| Goal 3 | ... | ... | ...

# 🔴 Yearly Goals
- Hit $100K in funded profits
- Consistently follow my system for 12 months
- Build and test 3 full trading models

# 🟠 Quarterly Goals
- Reach 70% win rate over 3 months
- Finish all advanced psychology modules
- Run full backtest on USD pairs

# 🟣 Monthly Goals
- Submit 20 A+ trades to Journal
- Follow daily routine checklist 90%+
- Finish studying Market Mechanics lessons on YouTube`,
  },

  // ---------------- Playbook ----------------
  {
    id: "entry-model",
    name: "Entry Model",
    emoji: "📈",
    category: "Playbook",
    body: `# Entry Criteria:
[] LQ swept
[] Shift in structure
[] Entry at edge of zone
[] SL behind invalidation

# Setup Diagram:
@img
@img

# Model Examples:
@img
@img

# Things to Note:
Only use this entry model in high probability scenarios`,
  },
  {
    id: "trade-plan",
    name: "Trade Plan",
    emoji: "📋",
    category: "Playbook",
    body: `# 1. HTF Bias
[] Pro 4H Trend
[] Buy in 4H Discount / Sell in 4H Premium
[] Define 4H POI
- S&D Zones, Flip Zones, Order Blocks that caused BOS or MS

# 2. LTF Execution
[] 4H POI Mitigation
[] 15m LQ Sweep (V Shape Reaction)
[] Market Shift
[] Set entry limit order on edge of POI, stop loss behind zone

# 3. Trade Management
Full TP at +3R
Set & Forget — no partials, no trailing
Re-entry allowed only if criteria are fully met again

# 4. Risk Rules
Risk: 1% per trade
Max: 3 losses/day
Minimum SL: 2 pips
Pairs: EUR/USD, AUD/USD, GBP/USD
Trading Windows (SGT):
2:00 PM – 5:00 PM
7:00 PM – 10:00 PM

# 5. Reminders
(Read before each session)
"The hard trade is the right trade: If it is easy to sell, don't; and if it is easy to buy, don't. Do the trade that is hard to do and that which the crowd finds objectionable."
"Amateurs think about how much money they can make. Professionals think about how much money they could lose."
"Be patient with winning trades & be impatient with losing trades"
"Do more of that which is working and less of that which is not."`,
  },
];
