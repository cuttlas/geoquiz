# GeoQuiz - App Requirements

## Overview
GeoQuiz is an interactive geography quiz application where users generate custom quizzes by selecting geographic scope and quiz type. Users build quizzes from broad to specific (continent → country) and choose what to be quizzed on (cities, regions, capitals). Quizzes are shareable via URL.

## Core Features

### 1. Quiz Generator (Main View)
The landing page is a quiz generator where users configure their quiz:

**Geographic Scope Selection (Dynamic Cascading):**
- Start broad: Select continent or "World"
- Smart cascading: Each selection reveals the next level (if available)
- The system detects how many admin levels each country has
- Cascading continues as long as subdivisions exist at deeper levels

**Cascading hierarchy:**
```
World/Continent → Country → ADM1 (states/provinces) → ADM2 (counties/districts) → ...
```

**At any level, users can choose to be quizzed on:**
- **Cities** - Cities within the current scope
- **Capitals** - Capital cities within the current scope
- **Regions** - Subdivisions at the next admin level (if available)

**Population Filter (Cities only):**
- When "Cities" is selected, show population threshold dropdown
- Options: Any, 100K+, 500K+, 1M+, 5M+, 10M+
- Filters cities to only those above the selected population
- Affects item count shown on Generate button

**Generate Button:**
- Creates quiz based on selected filters
- Shows preview of how many items will be in the quiz

### 2. Shareable Quiz URLs
- Quiz configuration encoded in URL parameters
- Example: `/quiz?continent=Europe&country=France&type=cities`
- Users can share URLs to let others take the same quiz
- Opening a shared URL goes directly to the quiz

**URL Parameters:**
| Parameter | Values | Example |
|-----------|--------|---------|
| `continent` | Continent name or "world" | `continent=Asia` |
| `country` | Country code (ISO alpha-3) | `country=IDN` |
| `adm1` | ADM1 region ID | `adm1=west-java` |
| `adm2` | ADM2 region ID | `adm2=bandung` |
| `type` | `cities`, `capitals`, `regions` | `type=cities` |
| `minPop` | Population threshold (cities only) | `minPop=100000` |

**Example URLs:**
- `/quiz?continent=Europe&type=regions` → European countries
- `/quiz?continent=Europe&country=FRA&type=regions` → French régions
- `/quiz?continent=Asia&country=IDN&type=regions` → Indonesian provinces
- `/quiz?continent=Asia&country=IDN&adm1=west-java&type=regions` → West Java kabupaten
- `/quiz?continent=Asia&country=IDN&adm1=west-java&type=cities&minPop=100000` → Cities in West Java over 100K

### 3. Interactive Map
- Full-screen map with clickable markers/polygons
- Multiple map tile layers (CARTO, OpenStreetMap)
- Auto-zoom to fit all quiz items
- Visual feedback on markers:
  - Blue: Unanswered
  - Green: Correct answer
  - Red: Incorrect answer

### 4. Quiz Gameplay
- Display current question: "Where is [Location Name]?"
- User clicks on a map element to answer
- Immediate feedback (correct/incorrect)
- Score tracking (correct answers / total questions)
- Progress indicator
- End screen with final score and replay option

### 5. Theme Support
- Light and dark mode
- Persisted in localStorage
- Respects system preference by default

---

## Quiz Generator UI

### Dynamic Cascading Example

**Example: Drilling down into Indonesia**
```
┌─────────────────────────────────────────────────┐
│                   GeoQuiz                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Continent                                       │
│  ┌─────────────────────────────────────────┐    │
│  │ Asia                                 ▼  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Country (optional)                             │
│  ┌─────────────────────────────────────────┐    │
│  │ Indonesia                            ▼  │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Province (optional)         ← appears because  │
│  ┌─────────────────────────────────────────┐    │  Indonesia has
│  │ West Java                            ▼  │    │  ADM1 data
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Kabupaten (optional)        ← appears because  │
│  ┌─────────────────────────────────────────┐    │  West Java has
│  │ Select kabupaten...                  ▼  │    │  ADM2 data
│  └─────────────────────────────────────────┘    │
│                                                  │
│  What do you want to identify?                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Cities  │  │Capitals │  │ Regions │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │        Generate Quiz (18 items)         │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**How the UI adapts:**
- Each dropdown only appears if data exists at that level
- Labels adapt to local terminology (Province, State, Kabupaten, County, etc.)
- Selecting a region checks if deeper levels exist and shows the next dropdown
- "Regions" quiz type is only available if subdivisions exist at the next level

### Selection Rules
- Continent selection is required (or "World")
- Each subsequent level is optional (narrows the scope)
- Quiz type is required
- "Regions" is disabled if no subdivisions exist at the next level
- "Generate Quiz" shows item count before starting
- Population filter only appears when "Cities" is selected

---

## Example Quiz Configurations

| Scope Path | Type | Min Pop | Result |
|------------|------|---------|--------|
| World | Capitals | - | All world capitals (~195) |
| World | Cities | 10M+ | Megacities worldwide (~30) |
| World | Regions | - | All countries |
| Europe | Regions | - | European countries |
| Europe | Capitals | - | European capital cities |
| Europe | Cities | 1M+ | European cities over 1M |
| Europe → France | Regions | - | French régions |
| Europe → France | Cities | 100K+ | French cities over 100K |
| Europe → France → Île-de-France | Cities | Any | Cities in Île-de-France |
| N. America → USA | Regions | - | US states (50) |
| N. America → USA | Capitals | - | US state capitals |
| N. America → USA → California | Regions | - | California counties |
| N. America → USA → California | Cities | 100K+ | California cities over 100K |
| Asia → Indonesia | Regions | - | Indonesian provinces |
| Asia → Indonesia → West Java | Regions | - | West Java kabupaten |
| Asia → Indonesia → West Java | Cities | Any | Cities in West Java |
| Asia → Indonesia → West Java → Bandung | Cities | Any | Cities in Bandung kabupaten |

---

## Data Requirements

### Places Data
- Name
- Coordinates (latitude, longitude)
- Country (ISO alpha-3 code)
- Continent
- Feature type (city, capital, town)
- Population (optional)
- Parent area reference (for filtering by region)
- Image URL (optional)
- Wikipedia URL (optional)

### Areas Data
- Name
- Local name for admin type (e.g., "Province", "State", "Kabupaten")
- Admin level (0=country, 1=state/province, 2=county, etc.)
- Country code
- Continent
- Parent area reference (for hierarchy traversal)
- Centroid coordinates
- Geometry (GeoJSON polygon)

### Hierarchy Support
- Areas must reference their parent area for cascading to work
- System needs to detect max admin depth per country
- Labels should use local terminology when available

---

## Non-Functional Requirements

### Performance
- Map should load within 2 seconds
- Quiz items should render smoothly (up to 200 items)
- Responsive on desktop and tablet

### Accessibility
- Keyboard navigation support
- Sufficient color contrast
- Screen reader friendly labels

### Browser Support
- Chrome, Firefox, Safari, Edge (latest versions)
