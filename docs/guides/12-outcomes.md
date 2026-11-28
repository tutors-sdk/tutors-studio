# 12. What students can do

Studio can keep the course's learning outcomes and show you, week by week, where each one is taught, practised and assessed. It's optional: a course with no outcomes looks exactly as before.

## Writing the outcomes

On the course home, under **Course details**, **What students can do** lists the outcomes.

1. Press **Add an outcome**. Each one starts "Students can", such as "Students can build a page with a form".
2. Choose how deeply students should know it: **Remember**, **Understand**, **Apply**, **Analyse**, **Evaluate** or **Create** (Bloom's levels).
3. Press **Save outcomes**, then **Make this change**.

Each outcome gets an id (LO1, LO2 and so on) that stays with it. A removed outcome's id is never given to a new one.

## Saying what each item serves

Open a lecture, lab, reading or quiz. **Outcomes this teaches** (or **practises**, for a lab, or **assesses**, for a quiz) lists the course's outcomes. Tick the ones it serves and press **Save outcomes**. The change is one line in that item's page, and it shows first under **Before anything changes**. Saving a quiz in the quiz designer keeps the line.

## Asking the assistant

With an assistant chosen in Settings, **Suggest outcomes from my module description** takes the description from your module catalogue and asks it for outcomes. On a week, **Ask your AI agent which outcomes each item serves** tags the week's items. Either way you see the plan, with the assistant's reasons, before anything changes.

## The map

Once the course has outcomes, **Where the course serves each** shows them down the side and the weeks across. A lecture or reading counts as **Lecture**, a lab as **Lab** and a quiz as **Quiz**. Studio flags what may need a look, and never stops you publishing:

- **Not yet practised**: no lab serves the outcome.
- **Assessed before it is taught**: a quiz serves it in an earlier week than any lecture.
- **No item serves it yet**: nothing is tagged with it.
- **Nothing tagged**, under a week: no item in that week serves any outcome.

## Where they're kept

In **Advanced mode** terms: `outcomes.yaml` at the course root, and `outcomes: [LO1, LO3]` in each tagged page's front matter. Tutors builds and checks the course the same with or without them, and doesn't show them to students yet.

## Next

[Studio from a terminal](11-command-line.md) has `outcomes` and `tag` for scripts.
