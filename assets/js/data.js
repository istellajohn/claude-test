/* VALENCE Journal · content index
   Every published piece is a catalogued body. Add new pieces here; listings, the catalogue
   chart and "next" links all read from this file.

   SPECIMEN EDITION: subjects, texts and dates below are placeholders written for layout.
   Interview subjects are deliberately unnamed. Replace with real pieces before launch.

   Fields per entry
   id        catalogue designation, also the plate seed
   type      "interview" | "essay"
   letter    issue number (one letter per new moon)
   date      ISO date of the new moon the piece was published on
   field     subject area used for filters and the chart
   title     headline; wrap one word in {braces} to set it in the script face
   subject   optional: who the conversation is with (cards show the dek when empty)
   dek       one or two sentences
   minutes   reading time ("transit time")
   href      page for the piece
   image     optional path to a photograph; when empty the generative plate is used */

window.VALENCE = {
  letters: [
    { n: 1, date: "2026-01-18" },
    { n: 2, date: "2026-02-17" },
    { n: 3, date: "2026-03-19" },
    { n: 4, date: "2026-04-17" },
    { n: 5, date: "2026-05-16" },
    { n: 6, date: "2026-06-15" },
    { n: 7, date: "2026-07-14" },
    { n: 8, date: "2026-08-12", note: "Total solar eclipse" },
    { n: 9, date: "2026-09-11" }
  ],

  entries: [
    {
      id: 14, type: "interview", letter: 9, date: "2026-09-11", field: "Cinema",
      title: "Nobody Looks Like Themselves {at} Noon",
      subject: "A cinematographer who has spent twenty years lighting faces in the dark",
      dek: "On why the face arrives before the story, why flattering light is usually a lie, and what an audience decides in the first second of a close-up.",
      minutes: 16, href: "interview.html", image: ""
    },
    {
      id: 13, type: "essay", letter: 9, date: "2026-09-11", field: "Perception",
      title: "You Are Looking {at} Old Light",
      subject: "",
      dek: "Reputation travels like starlight. By the time it reaches anyone, the source has usually moved on. On the delay between who you are and how you are seen.",
      minutes: 9, href: "essay.html", image: ""
    },
    {
      id: 12, type: "interview", letter: 8, date: "2026-08-12", field: "Science",
      title: "Two Minutes {of} Totality",
      subject: "An eclipse chaser who has stood in the Moon's shadow eleven times",
      dek: "Why grown adults cry in the dark at noon, and why the people who have seen it once spend the rest of their lives arranging to see it again.",
      minutes: 13, href: "interview.html", image: ""
    },
    {
      id: 11, type: "interview", letter: 7, date: "2026-07-14", field: "Founders",
      title: "The Second Generation Inherits {the} Questions",
      subject: "A second-generation founder who took over a family name before earning it",
      dek: "On walking into rooms that already have an opinion of your surname, and the slow work of being read as yourself.",
      minutes: 16, href: "interview.html", image: ""
    },
    {
      id: 10, type: "essay", letter: 7, date: "2026-07-14", field: "Perception",
      title: "In Praise {of the} Far Side",
      subject: "",
      dek: "The Moon shows us the same face every night. On the parts of a person, or a company, that should stay unlit.",
      minutes: 7, href: "essay.html", image: ""
    },
    {
      id: 9, type: "interview", letter: 6, date: "2026-06-15", field: "Craft",
      title: "Scent Skips {the} Queue",
      subject: "A perfumer who builds fragrances from other people's memories",
      dek: "On the only sense that reaches memory before reason, and why the most expensive note in a perfume is often the one you cannot name.",
      minutes: 11, href: "interview.html", image: ""
    },
    {
      id: 8, type: "interview", letter: 5, date: "2026-05-16", field: "Science",
      title: "We Measure the Universe {with} Patience",
      subject: "An astrophysicist who studies stars that pulse",
      dek: "On variable stars, a century-old discovery made by hand on glass plates, and why a regular rhythm is the most trusted signal in the sky.",
      minutes: 17, href: "interview.html", image: ""
    },
    {
      id: 7, type: "essay", letter: 5, date: "2026-05-16", field: "Perception",
      title: "Parallax",
      subject: "",
      dek: "Two rooms will always disagree about you. Astronomers use exactly that disagreement to measure how far away something is.",
      minutes: 8, href: "essay.html", image: ""
    },
    {
      id: 6, type: "interview", letter: 4, date: "2026-04-17", field: "Land",
      title: "Soil Keeps Better Records {than} We Do",
      subject: "An agronomist who spent a decade with millet farmers in the hills",
      dek: "On grain that was called poor food for a century, and what changed when the farmers, rather than the nutrients, became the story.",
      minutes: 15, href: "interview.html", image: ""
    },
    {
      id: 5, type: "interview", letter: 3, date: "2026-03-19", field: "Music",
      title: "Silence Has {a} Key Signature",
      subject: "A film composer who scores the scenes nobody speaks in",
      dek: "On writing for the pause, why audiences remember the bar before the melody, and the courage it takes to leave a scene unscored.",
      minutes: 12, href: "interview.html", image: ""
    },
    {
      id: 4, type: "essay", letter: 3, date: "2026-03-19", field: "Perception",
      title: "Albedo",
      subject: "",
      dek: "The Moon has no light of its own. On reputations that are entirely reflected, and what happens when the source looks away.",
      minutes: 6, href: "essay.html", image: ""
    },
    {
      id: 3, type: "interview", letter: 2, date: "2026-02-17", field: "Capital",
      title: "Money Is a Story Told {over} Three Generations",
      subject: "A family-office founder who advises families on what to keep",
      dek: "On trust that has to outlive the person who built it, and why the hardest conversation in wealth is about who decides, not how much.",
      minutes: 18, href: "interview.html", image: ""
    },
    {
      id: 2, type: "interview", letter: 1, date: "2026-01-18", field: "Architecture",
      title: "A Building Should Know {what} Time It Is",
      subject: "An architect who designs around the path of the sun",
      dek: "On rooms that change their mind across a day, and why the most honest material in any building is the light it lets in.",
      minutes: 14, href: "interview.html", image: ""
    },
    {
      id: 1, type: "essay", letter: 1, date: "2026-01-18", field: "Perception",
      title: "Everything Famous Was Once {Faint}",
      subject: "",
      dek: "On the long middle period when good work is visible only to the people standing very close to it.",
      minutes: 7, href: "essay.html", image: ""
    }
  ],

  /* Drawn one at a time on the home page */
  questions: [
    "Which small detail from something you saw years ago still changes the way you look at the world?",
    "Who taught you to look at it that way?",
    "What have you learned to see that you once walked past?",
    "What part of your work would surprise the person you were when you began?",
    "What are you still doing simply because you love it?"
  ],

  /* Optional photographs for page-level image slots (see docs/image-prompts.md).
     Leave empty to use the generative plates. */
  images: {
    essayHero: "assets/img/eye.jpg",       // essay hero and home feature: the eye
    interviewHero: "assets/img/profile.jpg",   // interview hero and home feature: the profile
    homeInterlude: "assets/img/star-trails.jpg",   // home question band: the star trails
    homeLetter: "assets/img/moonrise.jpg",      // home letter panel: the reaching hand
    essaysBanner: "assets/img/limb.jpg"     // essays page banner: the horizon
  }
};
