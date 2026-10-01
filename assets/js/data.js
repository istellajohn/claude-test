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
      id: 14, type: "interview", letter: 9, date: "2026-09-11", field: "Cinema and portraiture",
      title: "The face {between} expressions",
      subject: "",
      dek: "On the decisions behind a close-up, and the moment a photograph begins to feel like the person in it.",
      minutes: 16, href: "interview.html", image: ""
    },
    {
      id: 13, type: "essay", letter: 9, date: "2026-09-11", field: "Light and memory",
      title: "The light {arrives} late",
      subject: "",
      dek: "On what reaches us after its source has changed, and the impressions we continue to live by.",
      minutes: 9, href: "essay.html", image: ""
    },
    {
      id: 12, type: "interview", letter: 8, date: "2026-08-12", field: "Eclipses",
      title: "What two minutes {can} hold",
      subject: "",
      dek: "On the years of anticipation inside a brief encounter with an eclipse.",
      minutes: 13, href: "interview.html", image: ""
    },
    {
      id: 11, type: "interview", letter: 7, date: "2026-07-14", field: "Founders and succession",
      title: "When the name is {older} than you",
      subject: "",
      dek: "On entering a family business and finding your own decisions inside its history.",
      minutes: 16, href: "interview.html", image: ""
    },
    {
      id: 10, type: "essay", letter: 7, date: "2026-07-14", field: "Private life",
      title: "The life {outside} the frame",
      subject: "",
      dek: "On the parts of another person's life we never get to see, and what our curiosity asks of them.",
      minutes: 7, href: "essay.html", image: ""
    },
    {
      id: 9, type: "interview", letter: 6, date: "2026-06-15", field: "Perfumery",
      title: "Before the memory {finds} its words",
      subject: "",
      dek: "On scent and the past it can return us to before we have named the feeling.",
      minutes: 11, href: "interview.html", image: ""
    },
    {
      id: 8, type: "interview", letter: 5, date: "2026-05-16", field: "Astrophysics",
      title: "The years inside an {unanswered} question",
      subject: "",
      dek: "On scientific patience and making a life around something you may never finish understanding.",
      minutes: 17, href: "interview.html", image: ""
    },
    {
      id: 7, type: "essay", letter: 5, date: "2026-05-16", field: "Perspective",
      title: "From where you are {standing}",
      subject: "",
      dek: "On the small changes of position that alter what we think we know.",
      minutes: 8, href: "essay.html", image: ""
    },
    {
      id: 6, type: "interview", letter: 4, date: "2026-04-17", field: "Land",
      title: "What the soil will {not} forget",
      subject: "",
      dek: "On cultivation, the traces it leaves and learning to read what the ground has kept.",
      minutes: 15, href: "interview.html", image: ""
    },
    {
      id: 5, type: "interview", letter: 3, date: "2026-03-19", field: "Music",
      title: "The breath {before} the note",
      subject: "",
      dek: "On listening, restraint and the choices a singer makes before the sound begins.",
      minutes: 12, href: "interview.html", image: ""
    },
    {
      id: 4, type: "essay", letter: 3, date: "2026-03-19", field: "Reflected light",
      title: "Borrowed {light}",
      subject: "",
      dek: "On the people whose attention changes how we see ourselves.",
      minutes: 6, href: "essay.html", image: ""
    },
    {
      id: 3, type: "interview", letter: 2, date: "2026-02-17", field: "Capital and family",
      title: "What a family hands down {with} its money",
      subject: "",
      dek: "On the expectations and habits that travel with wealth between generations.",
      minutes: 18, href: "interview.html", image: ""
    },
    {
      id: 2, type: "interview", letter: 1, date: "2026-01-18", field: "Architecture",
      title: "The hours a building {holds}",
      subject: "",
      dek: "On making spaces for the different lives and times of day that will inhabit them.",
      minutes: 14, href: "interview.html", image: ""
    },
    {
      id: 1, type: "essay", letter: 1, date: "2026-01-18", field: "Discovery",
      title: "Before anybody knew {to} look",
      subject: "",
      dek: "On unfamiliar work, and the attention that helps us recognise what we have been overlooking.",
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
    essaysBanner: "assets/img/limb.jpg",    // essays page banner: the horizon
    aboutHero: "assets/img/moonrise.jpg"        // about page banner: the observatory
  }
};
