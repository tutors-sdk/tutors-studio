/**
 * The shapes of real Tutors courses, as named templates (ADR 0041): every week, unit and item with its title,
 * and each lab's steps, read from these repositories at these commits. Only the shape and titles are kept;
 * every page Studio writes from them is its own starter text. Regenerate by reading each course again.
 *
 * - edeleastar/module-web-dev-2-2022 at dfa26b8
 * - edeleastar/module-mobile-app-dev-oth at 6950eb7
 * - edeleastar/module-agile-soft-dev-2013 at 0a68842
 * - tutors-sdk/tutors-reference-course at 16187b2
 * - jouwdan/lc-cs at 42ff883
 */
import type { ExampleCourse } from "./example-course-shape.ts";

export const exampleCourses: readonly ExampleCourse[] = [
  {
    id: "web-dev-2",
    name: "Web Development II",
    modelledOn: "edeleastar/module-web-dev-2-2022",
    summary: "JavaScript and Node.js web apps over 8 weeks: lectures and step-by-step labs in each week's units, ending with a WeatherTop assignment.",
    weeks: [
      {
        title: "1: Introducing Javascript",
        items: [],
        units: [
          {
            title: "Introducing Javascript",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 01 JS Intro",
                steps: [
                  "Running Javascript",
                  "Variables",
                  "Primitive Data Types",
                  "Boolean Logic",
                  "Const, Let & Simple Objects",
                  "Objects with Functions",
                  "Chrome Debugger",
                  "Exercises",
                ],
              },
              { kind: "talk", title: "Module Overview" },
              { kind: "talk", title: "JS Introduction" },
              { kind: "talk", title: "Variables & Logic" },
              { kind: "talk", title: "Const, Let & Objects" },
            ],
          },
        ],
      },
      {
        title: "2: Javascript Arrays",
        items: [],
        units: [
          {
            title: "Javascript Variables, Objects & Methods",
            side: false,
            items: [
              { kind: "talk", title: "Variables & Objects Review" },
              { kind: "talk", title: "Methods & Arrays Review" },
            ],
          },
          {
            title: "Javascript Arrays",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 02 JS Arrays",
                steps: ["Array Basics", "Array Methods", "Array Iteration: for", "Array Iteration: While loops", "Arrays of Objects", "Nested Arrays"],
              },
              { kind: "talk", title: "Arrays: Basics" },
              { kind: "talk", title: "Array Methods" },
              { kind: "talk", title: "Array Iteration" },
              { kind: "talk", title: "Arrays of Objects" },
            ],
          },
        ],
      },
      {
        title: "3: Glitch Overview",
        items: [],
        units: [
          {
            title: "Introducing Glitch",
            side: false,
            items: [
              { kind: "lab", title: "Lab 03a Glitch Intro", steps: ["Setup", "Create Project", "Project Structure and Editing", "Project Settings & Export", "Exercises"] },
              { kind: "talk", title: "Introducing Glitch" },
              { kind: "talk", title: "Guided Tour" },
              { kind: "talk", title: "Labs" },
            ],
          },
          {
            title: "Glitch Deep Dive",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 03b Todo 1",
                steps: ["Setup", "Create Project", "Branding", "Dashboard View", "Todo Model", "Dashboard Controller", "WebStorm & Node", "Download Project", "Exercises"],
              },
              { kind: "lab", title: "Lab 03c Todo 2", steps: ["Setup", "Branding Update", "ID Support", "Delete Button", "Dashboard Controller", "Solution"] },
              {
                kind: "lab",
                title: "Lab 03d Todo 3",
                steps: ["Setup", "Branding + Logout Menu", "Signup / Login Views", "User Store", "Accounts Controller + Routes", "Todos by Userid", "Solution"],
              },
            ],
          },
        ],
      },
      {
        title: "4: Web Applications",
        items: [],
        units: [
          {
            title: "Playlist 1",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 04a Playlist 1",
                steps: ["Template 1", "Playlist", "Static Playlist", "Dynamic Playlist", "playlist-store", "Multiple playlists", "Introducing JSON", "Exercises & Archives"],
              },
              { kind: "lab", title: "Lab 04b WebStorm", steps: ["Node & Webstorm", "Setup Project", "WebStorm", "Debug"] },
              { kind: "talk", title: "Web App Introduction" },
              { kind: "talk", title: "Front-end" },
              { kind: "talk", title: "Modules" },
              { kind: "talk", title: "Back-end" },
            ],
          },
        ],
      },
      {
        title: "5: Templates & Routes",
        items: [],
        units: [
          {
            title: "Views, templating + JSON Models",
            side: false,
            items: [
              { kind: "talk", title: "Templates" },
              { kind: "talk", title: "Json" },
            ],
          },
          {
            title: "Controller, Routes & Models",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 05 Playlist 2",
                steps: [
                  "Exercise Solutions",
                  "Playlist Summaries",
                  "Router + Controller",
                  "Controller/View/Route",
                  "Playlists",
                  "Deleting Songs : Part 1",
                  "Deleting Songs : Part 2",
                  "Exercises",
                ],
              },
              { kind: "talk", title: "Dashboard" },
              { kind: "talk", title: "Playlist" },
              { kind: "talk", title: "MVC" },
            ],
          },
        ],
      },
      {
        title: "6: Forms",
        items: [],
        units: [
          {
            title: "Forms",
            side: false,
            items: [
              { kind: "lab", title: "Lab 06 Playlist 3", steps: ["Exercise Solutions", "Adding a Song", "ID Management", "Adding playlists", "Persistence", "Exercises"] },
              { kind: "talk", title: "Delete Song" },
              { kind: "talk", title: "Forms Design" },
              { kind: "talk", title: "Form Programming" },
            ],
          },
        ],
      },
      {
        title: "7: Sessions",
        items: [],
        units: [
          {
            title: "Reintroducing Sessions",
            side: false,
            items: [
              { kind: "talk", title: "Sessions Introduction" },
              { kind: "talk", title: "Using Sessions" },
            ],
          },
          {
            title: "Implementing Sessions",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 07a Playlist 4",
                steps: ["Exercises Solutions", "Playlist Model", "UserStore", "Accounts views", "Accounts controller", "Routes", "Dashboard", "Exercise"],
              },
              { kind: "lab", title: "Lab 07b Playlist 5", steps: ["Setup", "UX", "Model Changes", "Song Controller", "Routes", "Solution"] },
              {
                kind: "lab",
                title: "Lab 07c Playlist 6",
                steps: ["Setup", "Feature", "Develop the Algorithm", "Test the Algorithm", "Update the View", "Utils Pattern", "Exercise 1", "Exercise 2"],
              },
              { kind: "talk", title: "Sessions UX" },
              { kind: "talk", title: "Creating Sessions" },
            ],
          },
        ],
      },
      {
        title: "8: Weather Top V2",
        items: [],
        units: [
          {
            title: "WeatherTop V1 Solution",
            side: false,
            items: [
              { kind: "talk", title: "WeatherTop" },
              { kind: "web", title: "WeatherTop Repo", url: "https://github.com/wit-hdip-comp-sci-2021/weather-top" },
            ],
          },
          {
            title: "WeatherTop V2 Specification",
            side: false,
            items: [
              { kind: "archive", title: "Project Submission Template" },
              { kind: "talk", title: "WeatherTop Assignment Briefing" },
              { kind: "talk", title: "Weathertop 2.0" },
              { kind: "web", title: "Assignment Submission", url: "https://moodle.wit.ie/mod/assign/view.php?id=3722898" },
            ],
          },
          {
            title: "APIs & Charts",
            side: false,
            items: [
              { kind: "lab", title: "Lab 08a OpenWeatherMap", steps: ["Open Weather", "Current Weather", "Docs", "Exercises"] },
              { kind: "lab", title: "Lab 08b API Access", steps: ["Setup", "Create Project", "Branding", "Weather Report", "Axios Component", "API Request", "Solution"] },
              { kind: "lab", title: "Lab 08c Charts", steps: ["Setup", "Charts", "Weather Trend Data", "Trend Data Subset", "Plotting the Data", "Solution"] },
            ],
          },
        ],
      },
    ],
    side: [],
    home: [],
  },
  {
    id: "mobile-app-dev",
    name: "Android Programming in Kotlin",
    modelledOn: "edeleastar/module-mobile-app-dev-oth",
    summary: "Android apps in Kotlin over 13 weeks: lectures and labs grouped in units each week.",
    weeks: [
      {
        title: "Assignment",
        items: [],
        units: [
          { title: "Assignment Specification (preliminary)", side: false, items: [{ kind: "talk", title: "Archaeological Fieldwork" }] },
          {
            title: "Assignment Specification (complete)",
            side: false,
            items: [
              { kind: "archive", title: "Project Submission Template" },
              { kind: "talk", title: "Archaeological Fieldwork (complete)" },
              { kind: "web", title: "Assignment Submission", url: "https://elearning.uni-regensburg.de/mod/assign/view.php?id=1404883" },
            ],
          },
        ],
      },
      {
        title: "00: Introduction",
        items: [],
        units: [
          {
            title: "Module Overview",
            side: false,
            items: [
              { kind: "talk", title: "Module Overview" },
              { kind: "talk", title: "Evolution of Kotlin" },
              { kind: "talk", title: "Kotlin in Context" },
            ],
          },
          {
            title: "Introducing Android",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A00 Studio",
                steps: ["Setup", "New Project", "Run", "Refactor", "Key Project Files & Resources", "Logging Event Handling in Kotlin", "Solution"],
              },
              { kind: "talk", title: "Android Overview 1" },
            ],
          },
        ],
      },
      {
        title: "01: Activities",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              { kind: "lab", title: "Lab A01 Activities", steps: ["Style & String Resources", "Layouts", "Event Handling", "Refactor", "Models", "Solution"] },
              { kind: "talk", title: "Android Overview 2" },
              { kind: "talk", title: "Basic Syntax I" },
              { kind: "talk", title: "App Activities" },
            ],
          },
        ],
      },
      {
        title: "02: Adapters",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A02 Adapters",
                steps: ["Exercises Solutions", "MainApp", "PlacemarkList", "Card + RecyclerView", "Menu & Actionbar", "Action Implementation", "Solution"],
              },
              { kind: "talk", title: "Basic Syntax II" },
              { kind: "talk", title: "Kotlin Deep Dive" },
              { kind: "talk", title: "Android Application Object" },
              { kind: "talk", title: "Recycler View + Adapters" },
            ],
          },
        ],
      },
      {
        title: "03: Models",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A03 Models",
                steps: [
                  "CompileSdkVersion Upgrade",
                  "Exercise Solutions",
                  "Introduce first Model Representation",
                  "PlacemarkListner",
                  "Parcelable",
                  "StartActivityWithData",
                  "Ids",
                  "Solution",
                ],
              },
              { kind: "talk", title: "Toolbar" },
              { kind: "talk", title: "Memory Store" },
              { kind: "talk", title: "Adapter + Listener" },
              { kind: "talk", title: "Parcelable" },
            ],
          },
        ],
      },
      {
        title: "04: Images",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A04 Images",
                steps: ["Exercise Solutions", "Model Updates", "Add Image UI", "Selecting Images", "Displaying the Image", "Displaying the image in Edit mode", "Solution"],
              },
              { kind: "talk", title: "Android Platform, Components & Activities" },
              { kind: "talk", title: "Resources" },
              { kind: "talk", title: "Model Updates" },
              { kind: "talk", title: "Images" },
            ],
          },
        ],
      },
      {
        title: "05: Maps",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A05 MapActivity",
                steps: [
                  "Exercise Solutions",
                  "Location Resources",
                  "Google Maps Activity",
                  "Tidy up Generated code",
                  "Location Model",
                  "Recover Location from Activity",
                  "Listening for Marker Drag Events",
                  "Solution",
                ],
              },
              { kind: "talk", title: "App Structure" },
              { kind: "talk", title: "Map Activity" },
              { kind: "talk", title: "Cameras & Markers" },
            ],
          },
        ],
      },
      {
        title: "06: Persistence",
        items: [],
        units: [
          {
            title: "Android Programming",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A06 JSON",
                steps: ["Exercises", "MainApp & PlacemarkListActivity Adjustments", "Persistence", "FileHelpers", "PlacemarkJSONStore", "MainApp", "Solution"],
              },
              { kind: "talk", title: "File Formats" },
              { kind: "talk", title: "JSON" },
              { kind: "talk", title: "JSON Store" },
            ],
          },
        ],
      },
      {
        title: "07: Layouts",
        items: [],
        units: [
          {
            title: "Layouts",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A07 MapView",
                steps: ["Exercises", "PlacemarkMapsActivity", "Experiments with ConstraintLayout", "Map Component", "Markers", "CardView", "Marker Listener", "Solution"],
              },
              { kind: "talk", title: "Constraint Layout" },
              { kind: "talk", title: "Overall Map Activity" },
            ],
          },
        ],
      },
      {
        title: "08: MVP",
        items: [],
        units: [
          {
            title: "Model View Presenter",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A08a MVP I",
                steps: [
                  "Exercise Solution",
                  "Exercise Solution",
                  "PlacemarkActivity -> PlacemarkView/Presenter",
                  "PlacemarkListActivity -> View/Presenter",
                  "MapsActivity -> View/Presenter",
                  "Refactor package structure",
                  "Exercises",
                ],
              },
              { kind: "talk", title: "Model View Presenter" },
              { kind: "talk", title: "View/Presenter" },
            ],
          },
          {
            title: "BaseView / BasePresenter",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab A08b MVP II",
                steps: ["Solutions", "Solutions", "BaseView/Presenter", "PlacemarkPresenter/View", "PlacemarkListView/Presenter", "Solution"],
              },
              { kind: "talk", title: "BaseView BasePresenter" },
            ],
          },
        ],
      },
      {
        title: "09: Location",
        items: [],
        units: [
          {
            title: "Last Known Location",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 09a Location",
                steps: [
                  "Solutions",
                  "Placemark Activity Bugs",
                  "MapView",
                  "PlacemarkView",
                  "Location Libraries",
                  "Location Permissions",
                  "Requesting the Current Location",
                  "Solution",
                ],
              },
              { kind: "talk", title: "Location API" },
              { kind: "talk", title: "Current Location" },
            ],
          },
          {
            title: "Current Location Tracking",
            side: false,
            items: [
              { kind: "lab", title: "Lab 09b Tracking", steps: ["Exercise Solution 1", "PlacemarkView", "Live Location Updates", "Exercises"] },
              { kind: "talk", title: "Jetpack & AndroidX" },
              { kind: "talk", title: "Location Tracking" },
            ],
          },
        ],
      },
      {
        title: "10: Rooms (+ Firebase)",
        items: [],
        units: [
          {
            title: "Rooms",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 10a Up Support",
                steps: ["Exercise Solutions", "Exercise 2 Solution - part 2", "Manifest Navigation Hierarchy", "Up Support", "Exercises"],
              },
              {
                kind: "lab",
                title: "Lab 10b Rooms",
                steps: [
                  "Exercise Solutions",
                  "Room Classes",
                  "Room Classes & Annotations",
                  "PlacemarkStoreRoom - Version 1",
                  "Anko Coroutines - PlacemarkListPresenter",
                  "# Anko Coroutines - PlacemarkPresenter and PlacemarkMapPresenter",
                  "Solution",
                ],
              },
              { kind: "talk", title: "Rooms" },
              { kind: "talk", title: "Rooms in Placemark" },
            ],
          },
          {
            title: "Firebase Authentication in Placemark",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 10c Firebase Auth",
                steps: ["Exercise", "Login Layout", "Login View/Presenter", "Logout", "Firebase", "Connect the App", "Progress", "Signup/Login Implementation", "Solution"],
              },
              { kind: "talk", title: "Firebase Auth" },
            ],
          },
        ],
      },
      {
        title: "11: Firebase",
        items: [],
        units: [
          {
            title: "Firebase Database",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 11a Firebase Database",
                steps: ["Solutions", "PlacemarkMapPresenter", "Preparing for Firebase", "Firebase Database", "FireStore", "Login", "Console", "Solution"],
              },
              { kind: "lab", title: "Lab 11b Firebase Storage", steps: ["Exercise Solution", "Image Management", "Firebase Storage", "PlacemarkFireStore", "Solution"] },
              { kind: "talk", title: "Placemark Firebase Database" },
              { kind: "talk", title: "Placemark Image Storage" },
            ],
          },
        ],
      },
    ],
    side: [],
    home: [],
  },
  {
    id: "agile-soft-dev",
    name: "Agile Software Development",
    modelledOn: "edeleastar/module-agile-soft-dev-2013",
    summary: "Java, test-driven development and the SOLID principles over 13 weeks: several lectures and a lab each week.",
    weeks: [
      {
        title: "Assignments",
        items: [
          { kind: "talk", title: "Assignment 1" },
          { kind: "talk", title: "Assignment 2" },
          { kind: "talk", title: "Assignment 2 Submission Template" },
        ],
        units: [],
      },
      {
        title: "1: Paradigms & Languages",
        items: [
          {
            kind: "lab",
            title: "Lab 01 Eclipse & Java",
            steps: ["Install JDK", "Verify JDK", "HelloWorld", "Data Structure", "Debug", "Git Version Control", "Pattern", "Component", "Exercises"],
          },
          { kind: "note", title: "RefCardz: Agile Adoption" },
          { kind: "note", title: "RefCardz: Eclipse" },
          { kind: "talk", title: "Introduction" },
          { kind: "talk", title: "Software Paradigms" },
          { kind: "talk", title: "Programming Language Evolution" },
          { kind: "talk", title: "Programming Language Convergence" },
        ],
        units: [],
      },
      {
        title: "2: The Java Programming Language",
        items: [
          { kind: "lab", title: "Lab 02 CLI & Classes", steps: ["Setup", "Command Line Skeleton", "Users Feature", "toString", "Upgrade PacemakerAPI", "IDs", "Exercises"] },
          { kind: "talk", title: "Introduction" },
          { kind: "talk", title: "Basics + Arrays" },
          { kind: "talk", title: "Classes" },
          { kind: "talk", title: "Control Statements" },
          { kind: "talk", title: "Object Oriented Concepts" },
        ],
        units: [],
      },
      {
        title: "3: Inheritance & Collections",
        items: [
          {
            kind: "lab",
            title: "Lab 03 Objects & Serialization",
            steps: ["Activity & Location classes", "API + Commands", "Serialization", "Generalizing the Serializer", "Object References and Serialization", "Exercises"],
          },
          { kind: "talk", title: "Implementation Inheritance" },
          { kind: "talk", title: "Interface Inheritance" },
          { kind: "talk", title: "Introducing Collections" },
          { kind: "talk", title: "Using Collections" },
        ],
        units: [],
      },
      {
        title: "4: Serialization & Test Driven Development I",
        items: [
          {
            kind: "lab",
            title: "Lab 04 Testing",
            steps: [
              "Junit 4",
              "LocationTest",
              "Fixtures",
              "UserTest & ActivityTest",
              "Static Fixtures",
              "First PacemakerAPI Test",
              "More PacemakerAPITests",
              "Activities Tests",
              "Persistence Tests",
              "Test Packages",
              "Exercises",
            ],
          },
          { kind: "talk", title: "Streams" },
          { kind: "talk", title: "TDD Introduction" },
          { kind: "talk", title: "First Tests" },
        ],
        units: [],
      },
      {
        title: "5: Test Driven Development II",
        items: [
          { kind: "lab", title: "Lab 05 Refactoring", steps: ["ID Management", "Refactor User ID", "Refactor PacemakerAPI", "Git & Maven", "ascii-table", "Exercises"] },
          { kind: "note", title: "RefCardz: JUnit and EasyMock" },
          { kind: "talk", title: "Annotations" },
          { kind: "talk", title: "Pragmatic Testing Stack Example" },
          { kind: "talk", title: "Pragmatic Testing Video Player Example" },
          { kind: "talk", title: "Pacemaker Tests" },
        ],
        units: [],
      },
      {
        title: "6: Exceptions & Maven",
        items: [
          {
            kind: "lab",
            title: "Lab 06 Maven",
            steps: [
              "Verify your Maven Installation",
              "5-minute Maven Guide",
              "Pacemaker with Maven Project",
              "Incorporate Correct Library References",
              "Build",
              "Explore the local repo and use launch scripts",
              "Maven and JUnit5",
              "Exercises",
            ],
          },
          { kind: "note", title: "Maven - MultiModule" },
          { kind: "talk", title: "Exceptions" },
          { kind: "talk", title: "DevOps" },
          { kind: "talk", title: "Maven Introduction" },
          { kind: "talk", title: "Maven Example" },
        ],
        units: [],
      },
      {
        title: "7. TDDIII and Pacemaker Solution",
        items: [
          {
            kind: "lab",
            title: "Lab 07a Pacemaker Models",
            steps: [
              "Setup: Maven",
              "Setup : Eclipse",
              "Architecture",
              "User Model",
              "Activity & Location Models",
              "Refining the Models",
              "Activity Time & Duration Support",
              "Exercises",
            ],
          },
          {
            kind: "lab",
            title: "Lab 07b Pacemaker API",
            steps: [
              "PacemakerAPI",
              "Serializer Utility class",
              "PacemakerAPI XML Serialization",
              "PacemakerAPI JSON Serialization",
              "listActivities",
              "UX",
              "PacemakerConsoleService",
              "Solution",
            ],
          },
          { kind: "talk", title: "Writing Tests" },
          { kind: "talk", title: "Right BICEP" },
          { kind: "talk", title: "Java 8 & 9" },
        ],
        units: [],
      },
      {
        title: "8: SRP and TDD IV",
        items: [
          { kind: "lab", title: "Lab 08 Skeleton", steps: ["Setup", "Models", "Parsers", "Controllers", "Run the application", "Initial Command Implementations", "Exercises"] },
          { kind: "talk", title: "C.O.R.R.E.C.T" },
          { kind: "talk", title: "SOLID Principles" },
          { kind: "talk", title: "Single Responsibility Principle" },
        ],
        units: [],
      },
      {
        title: "09. OCP and REST",
        items: [
          {
            kind: "lab",
            title: "Lab 09 Rest API",
            steps: ["Solutions to Lab-08 Exercises", "Javalin Depencencies", "Start Rest Service", "First End Point", "Sample Data", "Creating a User", "Activities", "Exercises"],
          },
          { kind: "talk", title: "Open Closed Principle" },
          { kind: "talk", title: "HTTP Protocol" },
          { kind: "talk", title: "Introducing APIs" },
          { kind: "talk", title: "REST APIs" },
          { kind: "talk", title: "Javalin" },
        ],
        units: [],
      },
      {
        title: "10. LSP, TDD & Rest Client",
        items: [
          {
            kind: "lab",
            title: "Lab 10 Rest CLI",
            steps: [
              "Exercise Solutions",
              "pacemker-skeleton-client project",
              "PacemakerAPI in pacemaker-skeleton-client",
              "Retrofit",
              "PacemakerAPI",
              "Register & Login Commands",
              "AddActivity & ListActivity Commands",
              "Solution",
            ],
          },
          { kind: "talk", title: "Liskov Substitution Principle" },
          { kind: "talk", title: "Fragile Base Class" },
          { kind: "talk", title: "FIRST Principles" },
          { kind: "talk", title: "Kotlin Overview" },
        ],
        units: [],
      },
      {
        title: "11. ISP, DSP and Kotlin",
        items: [
          {
            kind: "lab",
            title: "Lab 11 Rest Test",
            steps: ["Exercise Solutions", "User Endpoints", "User Tests", "Create Activity Test", "Get and Delete Activity tests", "Deployment Preparation", "Heroku", "Exercises"],
          },
          { kind: "talk", title: "Interface Segregation Principle" },
          { kind: "talk", title: "Dependency Inversion Principle" },
          { kind: "talk", title: "Kotlin Syntax (1 of 2)" },
          { kind: "talk", title: "Kotlin Syntax (2 of 2)" },
        ],
        units: [],
      },
      {
        title: "12. Test Doubles + Lab Review",
        items: [
          {
            kind: "lab",
            title: "Lab 12 Kotlin",
            steps: ["Lab 11 Exercise Solutions", "Kotlin", "Models", "controllers User Endpoints", "controllers Activity Endpoints", "Exercises"],
          },
          { kind: "talk", title: "Lab 08-12 Review" },
          { kind: "talk", title: "XUnit Patterns" },
          { kind: "talk", title: "Test Doubles" },
        ],
        units: [],
      },
    ],
    side: [],
    home: [],
  },
  {
    id: "reference-course",
    name: "Reference Course",
    modelledOn: "tutors-sdk/tutors-reference-course",
    summary: "One week for each kind of thing Tutors shows: units, a sidebar, panel notes and talks, links, archives and a quiz.",
    weeks: [
      {
        title: "Simple",
        items: [],
        units: [
          {
            title: "Main Lesson",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 01 (md)",
                steps: [
                  "Text",
                  "Tables, Lines and Images",
                  "Links and Code Blocks",
                  "Images",
                  "Videos & Podcasts",
                  "Latex",
                  "Reference",
                  "Mermaid Diagrams",
                  "Exercises & Archives",
                ],
              },
              { kind: "note", title: "Lab-02 (jupyter)" },
              { kind: "talk", title: "Lecture 1 (PDF)" },
              { kind: "talk", title: "Lecture 2 (Marp)" },
            ],
          },
          {
            title: "Supporting Resources",
            side: false,
            items: [
              { kind: "archive", title: "Resource 1" },
              { kind: "note", title: "Note 1" },
              { kind: "web", title: "Web Site 1", url: "https://tutors.dev/" },
            ],
          },
        ],
      },
      {
        title: "Sidebar",
        items: [],
        units: [
          {
            title: "Labs for this Topic",
            side: true,
            items: [
              {
                kind: "lab",
                title: "Lab 03 (md)",
                steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
              },
              { kind: "lab", title: "Problem Sheet 1", steps: [] },
              { kind: "note", title: "Lab-04 (jupyter)" },
            ],
          },
          {
            title: "Main Lesson",
            side: false,
            items: [
              { kind: "talk", title: "Lecture 3 (PDF)" },
              { kind: "talk", title: "Lecture 4 (Marp)" },
              { kind: "web", title: "Web Site 2", url: "https://tutors.dev/" },
            ],
          },
          {
            title: "Supporting Resources",
            side: false,
            items: [
              { kind: "archive", title: "Resource 2" },
              { kind: "note", title: "Note 2" },
              { kind: "web", title: "Web Site 3", url: "https://tutors.dev/" },
            ],
          },
        ],
      },
      {
        title: "Videos",
        items: [],
        units: [
          {
            title: "Main Lesson",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 05 (md)",
                steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
              },
              { kind: "note", title: "Lab-06 (jupyter)" },
              { kind: "talk", title: "Lecture 5 (PDF)" },
              { kind: "talk", title: "Lecture 6 (Marp)" },
              { kind: "talk", title: "Lecture 7 (PDF)" },
            ],
          },
        ],
      },
      { title: "Panel Note", items: [{ kind: "panelnote", title: "Note 1" }], units: [] },
      { title: "Panel Talk", items: [{ kind: "paneltalk", title: "Lecture 1" }], units: [] },
      {
        title: "Reference",
        items: [
          { kind: "archive", title: "Resource 3" },
          {
            kind: "lab",
            title: "Lab 07 (md)",
            steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
          },
          { kind: "note", title: "Note 3" },
          { kind: "note", title: "Note 4" },
          { kind: "note", title: "Lab-08 (jupyter)" },
          { kind: "quiz", title: "Quiz Demo" },
          { kind: "talk", title: "Lecture 8 (Marp)" },
          { kind: "web", title: "Web Site 4", url: "https://tutors.dev/" },
        ],
        units: [],
      },
      {
        title: "Ordering",
        items: [],
        units: [
          {
            title: "Ordering",
            side: false,
            items: [
              {
                kind: "lab",
                title: "Lab 09 (md)",
                steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
              },
              { kind: "note", title: "Note 5" },
              { kind: "note", title: "Lab-10 (jupyter)" },
              { kind: "talk", title: "Lecture 9 (PDF)" },
            ],
          },
          {
            title: "Ordering",
            side: false,
            items: [
              { kind: "archive", title: "Resource 4" },
              { kind: "note", title: "Note 6" },
              { kind: "web", title: "Web Site 5", url: "https://tutors.dev/" },
            ],
          },
        ],
      },
      {
        title: "Podasts",
        items: [],
        units: [
          {
            title: "Labs for this Topic",
            side: true,
            items: [
              {
                kind: "lab",
                title: "Lab 11 (md)",
                steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
              },
              {
                kind: "lab",
                title: "Lab 13 (md)",
                steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
              },
              { kind: "lab", title: "Problem Sheet 2", steps: [] },
              { kind: "note", title: "Lab-12 (jupyter)" },
              { kind: "note", title: "Lab-14 (jupyter)" },
            ],
          },
          {
            title: "Main Lesson",
            side: false,
            items: [
              { kind: "talk", title: "Lecture 10 (Marp)" },
              { kind: "talk", title: "Lecture 11 (PDF)" },
              { kind: "web", title: "Web Site 6", url: "https://tutors.dev/" },
            ],
          },
          {
            title: "Supporting Resources",
            side: false,
            items: [
              { kind: "archive", title: "Resource 5" },
              { kind: "note", title: "Note 7" },
              { kind: "web", title: "Web Site 7", url: "https://tutors.dev/" },
            ],
          },
        ],
      },
      {
        title: "Iconify",
        items: [
          {
            kind: "lab",
            title: "Lab 15 (md)",
            steps: ["Text", "Tables, Lines and Images", "Links and Code Blocks", "Images", "Latex", "Reference", "Mermaid Diagrams", "Exercises & Archives"],
          },
          { kind: "note", title: "Lab-16 (jupyter)" },
          { kind: "talk", title: "Lecture 10 (Marp)" },
          { kind: "talk", title: "Lecture 11 (PDF)" },
          { kind: "talk", title: "Lecture 12 (Marp)" },
        ],
        units: [],
      },
    ],
    side: [],
    home: [],
  },
  {
    id: "lc-cs",
    name: "Leaving Cert CS",
    modelledOn: "jouwdan/lc-cs",
    summary: "Leaving Certificate Computer Science in 17 topics: a page to read in each, notes, labs and a quiz per topic, past papers and study tools beside them.",
    weeks: [
      {
        title: "01 · Start here",
        items: [
          { kind: "archive", title: "Practice files" },
          { kind: "lab", title: "Overview", steps: ["Save and run", "Keep a correction", "Plan a session"] },
          { kind: "note", title: "1. Learn: Start here" },
          { kind: "note", title: "4. Answers: Start here" },
          { kind: "note", title: "5. Exam: Start here" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Start here" },
          { kind: "talk", title: "6. Recap: Start here" },
          { kind: "web", title: "Official specification", url: "https://www.curriculumonline.ie/senior-cycle/senior-cycle-subjects/computer-science/" },
        ],
        units: [],
      },
      {
        title: "02 · Computer systems",
        items: [
          { kind: "lab", title: "Overview", steps: ["Draw the parts", "Trace instructions", "Explain your choices"] },
          { kind: "note", title: "1. Learn: Systems" },
          { kind: "note", title: "4. Answers: Systems" },
          { kind: "note", title: "5. Exam: Systems" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Systems" },
          { kind: "talk", title: "6. Recap: Systems" },
        ],
        units: [],
      },
      {
        title: "03 · Binary and logic",
        items: [
          { kind: "lab", title: "Overview", steps: ["Convert and calculate", "Build a truth table", "Explain the bits"] },
          { kind: "note", title: "1. Learn: Binary & logic" },
          { kind: "note", title: "4. Answers: Binary & logic" },
          { kind: "note", title: "5. Exam: Binary & logic" },
          { kind: "note", title: "Binary notebook" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Binary & logic" },
          { kind: "talk", title: "6. Recap: Binary & logic" },
        ],
        units: [],
      },
      {
        title: "04 · Networks",
        items: [
          { kind: "lab", title: "Overview", steps: ["Trace a web request", "Match threat and control", "Check and recover"] },
          { kind: "note", title: "1. Learn: Networks" },
          { kind: "note", title: "4. Answers: Networks" },
          { kind: "note", title: "5. Exam: Networks" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Networks" },
          { kind: "talk", title: "6. Recap: Networks" },
        ],
        units: [],
      },
      {
        title: "05 · Algorithms",
        items: [
          { kind: "lab", title: "Overview", steps: ["Design the steps", "Check the algorithm", "Explain and extend"] },
          { kind: "note", title: "1. Learn: Algorithms" },
          { kind: "note", title: "4. Answers: Algorithms" },
          { kind: "note", title: "5. Exam: Algorithms" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Algorithms" },
          { kind: "talk", title: "6. Recap: Algorithms" },
        ],
        units: [],
      },
      {
        title: "06 · Python",
        items: [
          { kind: "lab", title: "Overview", steps: ["Build one ticket", "Input and group totals", "Review and extend"] },
          { kind: "note", title: "1. Learn: Python" },
          { kind: "note", title: "4. Answers: Python" },
          { kind: "note", title: "5. Exam: Python" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Python" },
          { kind: "talk", title: "6. Recap: Python" },
          { kind: "web", title: "Python reference", url: "https://docs.python.org/3/tutorial/" },
        ],
        units: [],
      },
      {
        title: "07 · Lists and files",
        items: [
          { kind: "lab", title: "Overview", steps: ["Work with lists", "Text and CSV files", "Choose an extension"] },
          { kind: "note", title: "1. Learn: Lists & files" },
          { kind: "note", title: "4. Answers: Lists & files" },
          { kind: "note", title: "5. Exam: Lists & files" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Lists & files" },
          { kind: "talk", title: "6. Recap: Lists & files" },
        ],
        units: [],
      },
      {
        title: "08 · Search and sort",
        items: [
          { kind: "lab", title: "Overview", steps: ["Trace a search", "Trace sorting passes", "Recursion and cost"] },
          { kind: "note", title: "1. Learn: Search & sort" },
          { kind: "note", title: "4. Answers: Search & sort" },
          { kind: "note", title: "5. Exam: Search & sort" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Search & sort" },
          { kind: "talk", title: "6. Recap: Search & sort" },
        ],
        units: [],
      },
      {
        title: "09 · Testing",
        items: [
          { kind: "lab", title: "Overview", steps: ["Reproduce a fault", "Repair and retest", "Explain the evidence"] },
          { kind: "note", title: "1. Learn: Testing" },
          { kind: "note", title: "4. Answers: Testing" },
          { kind: "note", title: "5. Exam: Testing" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Testing" },
          { kind: "talk", title: "6. Recap: Testing" },
        ],
        units: [],
      },
      {
        title: "10 · Data",
        items: [
          { kind: "lab", title: "Overview", steps: ["Predict one change", "Check the data file", "Explain your results"] },
          { kind: "note", title: "1. Learn: Data" },
          { kind: "note", title: "4. Answers: Data" },
          { kind: "note", title: "5. Exam: Data" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Data" },
          { kind: "talk", title: "6. Recap: Data" },
        ],
        units: [],
      },
      {
        title: "11 · Models and simulation",
        items: [
          { kind: "lab", title: "Overview", steps: ["Predict the queue", "Run the experiment", "Check rules and limits"] },
          { kind: "note", title: "1. Learn: Models" },
          { kind: "note", title: "4. Answers: Models" },
          { kind: "note", title: "5. Exam: Models" },
          { kind: "note", title: "Queue notebook" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Models" },
          { kind: "talk", title: "6. Recap: Models" },
        ],
        units: [],
      },
      {
        title: "12 · Embedded systems",
        items: [
          { kind: "lab", title: "Overview", steps: ["Predict the warning", "Run the indicator", "Test the boundaries"] },
          { kind: "note", title: "1. Learn: Embedded" },
          { kind: "note", title: "4. Answers: Embedded" },
          { kind: "note", title: "5. Exam: Embedded" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Embedded" },
          { kind: "talk", title: "6. Recap: Embedded" },
        ],
        units: [],
      },
      {
        title: "13 · Web and databases",
        items: [
          { kind: "lab", title: "Overview", steps: ["Follow a search", "Change one record", "Test the website"] },
          { kind: "note", title: "1. Learn: Web apps" },
          { kind: "note", title: "4. Answers: Web apps" },
          { kind: "note", title: "5. Exam: Web apps" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Web apps" },
          { kind: "talk", title: "6. Recap: Web apps" },
        ],
        units: [],
      },
      {
        title: "14 · Society",
        items: [
          { kind: "lab", title: "Overview", steps: ["Check claims and risks", "Machine or test?", "Make a recommendation"] },
          { kind: "note", title: "1. Learn: Society" },
          { kind: "note", title: "4. Answers: Society" },
          { kind: "note", title: "5. Exam: Society" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Society" },
          { kind: "talk", title: "6. Recap: Society" },
        ],
        units: [],
      },
      {
        title: "15 · Projects",
        items: [
          { kind: "lab", title: "Overview", steps: ["Plan two tests", "Improve and retest", "Explain your work"] },
          { kind: "note", title: "1. Learn: Projects" },
          { kind: "note", title: "4. Answers: Projects" },
          { kind: "note", title: "5. Exam: Projects" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Projects" },
          { kind: "talk", title: "6. Recap: Projects" },
        ],
        units: [],
      },
      {
        title: "16 · Exam skills",
        items: [
          { kind: "lab", title: "Overview", steps: ["Plan the attempt", "Try the question", "Mark and retry"] },
          { kind: "note", title: "1. Learn: Exam skills" },
          { kind: "note", title: "4. Answers: Exam skills" },
          { kind: "note", title: "5. Exam: Exam skills" },
          { kind: "note", title: "Mock paper" },
          { kind: "note", title: "Mock answers" },
          { kind: "panelnote", title: "Your study route" },
          { kind: "quiz", title: "3. Quiz: Exam skills" },
          { kind: "talk", title: "6. Recap: Exam skills" },
        ],
        units: [],
      },
      {
        title: "17 · Past papers",
        items: [{ kind: "panelnote", title: "Find a paper and its answers" }],
        units: [
          { title: "2020 papers", side: false, items: [{ kind: "panelnote", title: "2020: choose your paper" }] },
          { title: "2021 papers", side: false, items: [{ kind: "panelnote", title: "2021: choose your paper" }] },
          { title: "2022 papers", side: false, items: [{ kind: "panelnote", title: "2022: choose your paper" }] },
          { title: "2023 papers", side: false, items: [{ kind: "panelnote", title: "2023: choose your paper" }] },
          { title: "2024 papers", side: false, items: [{ kind: "panelnote", title: "2024: choose your paper" }] },
          { title: "2025 papers", side: false, items: [{ kind: "panelnote", title: "2025: choose your paper" }] },
        ],
      },
    ],
    side: [
      {
        title: "Study tools",
        side: true,
        items: [
          { kind: "lab", title: "Overview", steps: ["Test record", "Reflect and plan"] },
          { kind: "note", title: "Course coverage" },
          { kind: "note", title: "Teacher guide" },
          { kind: "note", title: "Question index" },
          { kind: "paneltalk", title: "Study routine" },
        ],
      },
    ],
    home: [{ kind: "panelnote", title: "Start learning" }],
  },
];
