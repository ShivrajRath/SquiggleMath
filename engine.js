(function () {
'use strict';

/* =========================================================
   SquiggleMath — shared worksheet engine
   No frameworks, no backend, no dependencies.

   Loaded by both the home page and the standalone print page:
   1. CATALOG is built deterministically: 120 recipes per age
      group (5 skills × 6 layouts × 4 themes). Each recipe has a
      fixed seed, so its print page always renders the same sheet.
   2. buildWorksheet() turns any recipe/config into questions and
      renders a printable A4 .worksheet element.
   3. The generator creates a fresh random seed and calls the same
      builder. Randomness is handled by a tiny seeded PRNG
      (mulberry32) so every sheet is repeatable from its recipe.
   4. The print page clones the active sheet into #print-area. A
      dedicated @media print block hides the page chrome and shows
      only the A4 worksheet.
   ========================================================= */

'use strict';

/* ---------- small DOM helpers ---------- */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const SHEET_WIDTH = 794; // 210mm at 96dpi — our on-screen A4 canvas
const SHEET_HEIGHT = 1123; // 297mm at 96dpi
const MAX_PROBLEMS = 20;

/* =========================================================
   Configuration data
   ========================================================= */

/* Each age band is a full design system, not just a label: item caps,
   choice sets, typography scale and the grown-up support copy all live here. */
const DIFFICULTIES = {
  prek: {
    label: 'Pre-K',
    ages: 'Ages 3–4',
    badge: 'Pre-K • Ages 3–4',
    shortBadge: 'Pre-K',
    className: 'prek',
    emoji: '🖍️',
    focus: 'Pencil grip · counting to 5 · colours & shapes',
    promise: 'Big pictures, chunky boxes, no writing marathon.',
    defaultActivity: 'mixed-prek',
    defaultProblems: 5,
    maxProblems: 6,
    problemChoices: [4, 5, 6],
    session: '5–10 minutes',
    materials: 'A chunky crayon or pencil, plus crayons for the colouring bits.',
    tip: 'Follow your child’s lead. Do one section now and come back later if little hands get tired.',
    talk: '“Point and count with me. Touch each picture once.”',
    extension: 'Go on a colour or shape hunt around the room.',
  },
  k: {
    label: 'Kindergarten',
    ages: 'Ages 5–6',
    badge: 'Kindergarten • Ages 5–6',
    shortBadge: 'Kindergarten',
    className: 'k',
    emoji: '🧩',
    focus: 'Numbers to 10 · adding & taking away · shapes',
    promise: 'Picture support with real number practice.',
    defaultActivity: 'mixed10',
    defaultProblems: 8,
    maxProblems: 10,
    problemChoices: [6, 8, 10],
    session: '8–15 minutes',
    materials: 'A pencil and crayons for the colour-in prompts.',
    tip: 'Let your child use counters, fingers or the pictures. Understanding matters more than speed.',
    talk: '“Can you show me how you know?”',
    extension: 'Make up a number story about your favourite toy.',
  },
  g1: {
    label: '1st Grade',
    ages: 'Ages 6–7',
    badge: '1st Grade • Ages 6–7',
    shortBadge: '1st Grade',
    className: 'g1',
    emoji: '🚀',
    focus: 'Facts to 20 · place value · time, money & data',
    promise: 'Independent practice with one thinking challenge.',
    defaultActivity: 'mixed20',
    defaultProblems: 12,
    maxProblems: 15,
    problemChoices: [10, 12, 15],
    session: '10–20 minutes',
    materials: 'A pencil, plus counters or a ruler if you like.',
    tip: 'Ask your child to explain one answer out loud. Talking through maths builds stronger understanding.',
    talk: '“How did you work that out?”',
    extension: 'Try the challenge at the bottom of the sheet.',
  },
};

const THEMES = {
  dinos: {
    name: 'Dinos',
    emoji: '🦖',
    styleName: 'Dino',
    accent: '#2f8f5b',
    soft: '#e3f8ea',
    deco: ['🦕', '🌿', '🥚'],
    characters: ['Rex', 'Dina', 'Trixie'],
    who: 'dino',
    items: ['leaves', 'dino eggs', 'ferns'],
    hint: 'Roar! Little dinos will love this one.',
  },
  space: {
    name: 'Space',
    emoji: '🚀',
    styleName: 'Space',
    accent: '#5a5bd6',
    soft: '#ecebff',
    deco: ['🚀', '🪐', '⭐'],
    characters: ['Ava', 'Cosmo', 'Nova'],
    who: 'astronaut',
    items: ['stars', 'moon rocks', 'meteors'],
    hint: '3… 2… 1… blast off into maths!',
  },
  monsters: {
    name: 'Monsters',
    emoji: '👾',
    styleName: 'Monster',
    accent: '#a447c7',
    soft: '#f8e9ff',
    deco: ['👾', '🎃', '👻'],
    characters: ['Milo', 'Ziggy', 'Nia'],
    who: 'monster',
    items: ['googly eyes', 'candies', 'bouncy balls'],
    hint: 'Friendly monsters, zero scary maths.',
  },
  ocean: {
    name: 'Ocean',
    emoji: '🐳',
    styleName: 'Ocean',
    accent: '#0e86a8',
    soft: '#e0f6fb',
    deco: ['🐙', '🐠', '🫧'],
    characters: ['Finn', 'Coral', 'Bubbles'],
    who: 'ocean explorer',
    items: ['shells', 'pearls', 'bubbles'],
    hint: 'Dive in for a splash of number fun.',
  },
  unicorns: { name:'Unicorns', emoji:'🦄', styleName:'Unicorn', accent:'#d64fa2', soft:'#fdeaf6', deco:['🌈','🌸','⭐'], characters:['Luna','Sparkle','Petal'], who:'unicorn', items:['rainbows','flowers','stars'], hint:'Sparkly unicorn number magic!' },
  safari: { name:'Safari', emoji:'🦁', styleName:'Safari', accent:'#c77a12', soft:'#fdf1dc', deco:['🐘','🦒','🌳'], characters:['Zara','Kito','Lulu'], who:'safari explorer', items:['acacia leaves','mangoes','rocks'], hint:'A wild safari counting adventure.' },
  farm: { name:'Farm', emoji:'🐄', styleName:'Farm', accent:'#4b8f3a', soft:'#eaf7e3', deco:['🐔','🌾','🥕'], characters:['Barnaby','Clucky','Daisy'], who:'farmer', items:['eggs','carrots','hay bales'], hint:'Down on the farm, maths grows!' },
  jungle: { name:'Jungle', emoji:'🐒', styleName:'Jungle', accent:'#1f8f6a', soft:'#e2f8ef', deco:['🐍','🍌','🌴'], characters:['Mango','Kiki','Tiko'], who:'jungle explorer', items:['bananas','leaves','vines'], hint:'Swing into jungle number fun.' },
  pirates: { name:'Pirates', emoji:'🏴‍☠️', styleName:'Pirate', accent:'#8a5a2b', soft:'#f6ecdd', deco:['⚓','🦜','🗺️'], characters:['Captain Finn','Matey','Pearl'], who:'pirate', items:['gold coins','treasure chests','cannonballs'], hint:'X marks the spot for maths!' },
  fairy: { name:'Fairy', emoji:'🧚', styleName:'Fairy', accent:'#c05fc9', soft:'#fbeafa', deco:['🧚','🍄','✨'], characters:['Faye','Pip','Rosie'], who:'fairy', items:['wands','mushrooms','sparkles'], hint:'A sprinkle of fairy maths.' },
  robots: { name:'Robots', emoji:'🤖', styleName:'Robot', accent:'#3a6f8f', soft:'#e5f2f8', deco:['⚙️','🔋','🔩'], characters:['Bolt','Beep','Chip'], who:'robot', items:['gears','batteries','bolts'], hint:'Beep boop! Robot maths.' },
  construction: { name:'Construction', emoji:'🚧', styleName:'Construction', accent:'#d97a13', soft:'#fff0d8', deco:['🚜','🧱','🪚'], characters:['Builder Bob','Digger','Mixer'], who:'builder', items:['bricks','cones','nails'], hint:'Build big number skills.' },
  bugs: { name:'Bugs', emoji:'🐝', styleName:'Bug', accent:'#7a9a12', soft:'#f6f9df', deco:['🐞','🦋','🌼'], characters:['Buzz','Dot','Flutter'], who:'bug', items:['flowers','leaves','honey drops'], hint:'Tiny bugs, big maths.' },
  arctic: { name:'Arctic', emoji:'🐧', styleName:'Arctic', accent:'#2f7fb5', soft:'#e3f2fb', deco:['🧊','🌨️','❄️'], characters:['Polar','Snowy','Ice'], who:'arctic explorer', items:['snowballs','ice cubes','fish'], hint:'Cool arctic number fun.' },
  desert: { name:'Desert', emoji:'🌵', styleName:'Desert', accent:'#b07a2a', soft:'#fbf0dc', deco:['🐪','☀️','🦂'], characters:['Sandy','Camelot','Dune'], who:'desert explorer', items:['cactus flowers','dates','pebbles'], hint:'Sandy maths adventures.' },
  weather: { name:'Weather', emoji:'🌈', styleName:'Weather', accent:'#3b8fd0', soft:'#e5f4fd', deco:['☁️','🌦️','⛅'], characters:['Sunny','Storm','Misty'], who:'weather watcher', items:['raindrops','clouds','sunbeams'], hint:'Maths come rain or shine.' },
  bakery: { name:'Bakery', emoji:'🧁', styleName:'Bakery', accent:'#d95f8f', soft:'#fdeaf1', deco:['🍩','🍪','🍰'], characters:['Baker Bea','Crumbs','Sugar'], who:'baker', items:['cupcakes','cookies','doughnuts'], hint:'Sweet maths treats.' },
  pizza: { name:'Pizza', emoji:'🍕', styleName:'Pizza', accent:'#c94a32', soft:'#fde9e4', deco:['🧀','🍅','🫒'], characters:['Chef Pep','Mozza','Basil'], who:'pizza chef', items:['pizza slices','cheese','tomatoes'], hint:'Slice up some maths.' },
  sports: { name:'Sports', emoji:'⚽', styleName:'Sports', accent:'#2f8f5b', soft:'#e5f8ee', deco:['🏀','🏆','👟'], characters:['Sam','Jordan','Alex'], who:'athlete', items:['balls','medals','cones'], hint:'Score with maths.' },
  vehicles: { name:'Vehicles', emoji:'🚗', styleName:'Vehicle', accent:'#2f6bb5', soft:'#e6f0fc', deco:['🚌','🚲','🚁'], characters:['Driver Dot','Wheels','Pilot Pip'], who:'driver', items:['wheels','tickets','traffic cones'], hint:'Race into maths.' },
  circus: { name:'Circus', emoji:'🎪', styleName:'Circus', accent:'#d64545', soft:'#fde8e8', deco:['🎟️','🤹','🎈'], characters:['Jumbo','Trix','Bobo'], who:'circus star', items:['balloons','popcorn','juggling balls'], hint:'The greatest maths show.' },
  magic: { name:'Magic', emoji:'🪄', styleName:'Magic', accent:'#7a4fd6', soft:'#efe8ff', deco:['✨','🎩','🔮'], characters:['Wizard Wren','Hocus','Pocus'], who:'wizard', items:['spells','magic hats','crystals'], hint:'Abracadabra maths!' },
  superheroes: { name:'Superheroes', emoji:'🦸', styleName:'Superhero', accent:'#2f5fd6', soft:'#e7edff', deco:['💥','🛡️','⚡'], characters:['Captain Zoom','Mighty Mia','Flash'], who:'superhero', items:['stars','shields','power bolts'], hint:'Super-powered maths.' },
  music: { name:'Music', emoji:'🎵', styleName:'Music', accent:'#8f4fc9', soft:'#f5e9ff', deco:['🎸','🥁','🎶'], characters:['Melody','Drummer Dan','Lyra'], who:'musician', items:['notes','drums','guitar picks'], hint:' maths in harmony.' },
  pets: { name:'Pets', emoji:'🐶', styleName:'Pet', accent:'#c77a3a', soft:'#fbeee0', deco:['🐱','🦴','🐹'], characters:['Biscuit','Whiskers','Nibbles'], who:'pet pal', items:['bones','treats','balls'], hint:'Pet-friendly maths.' },
  holidays: { name:'Holidays', emoji:'🎄', styleName:'Holiday', accent:'#b53b3b', soft:'#fdeaea', deco:['🎁','⛄','🔔'], characters:['Santa','Elfie','Rudy'], who:'holiday helper', items:['gifts','candy canes','snowballs'], hint:'Festive maths fun.' },
  snow: { name:'Snow', emoji:'❄️', styleName:'Snow', accent:'#4f8fc9', soft:'#e8f4fd', deco:['⛄','🧣','🌨️'], characters:['Flurry','Frost','Snowball'], who:'snow friend', items:['snowflakes','snowballs','scarves'], hint:'Snowy maths adventures.' },
  rainforest: { name:'Rainforest', emoji:'🦜', styleName:'Rainforest', accent:'#2f8f5b', soft:'#e3f8ea', deco:['🐸','🌿','🦋'], characters:['Rio','Leaf','Pip'], who:'rainforest explorer', items:['leaves','berries','vines'], hint:'Rainforest number fun.' },
  firefighter: { name:'Firefighter', emoji:'🚒', styleName:'Firefighter', accent:'#c9452f', soft:'#fde9e5', deco:['🔥','🧯','💨'], characters:['Chief Ember','Sparky','Hose'], who:'firefighter', items:['hoses','helmets','water drops'], hint:'Fire up your maths.' },
  ballerina: { name:'Ballerina', emoji:'🩰', styleName:'Ballerina', accent:'#d66fa8', soft:'#fdeaf4', deco:['🌷','🎀','🩰'], characters:['Lily','Tutu','Rose'], who:'ballerina', items:['ribbons','flowers','bows'], hint:'Graceful maths moves.' },
  dragons: { name:'Dragons', emoji:'🐉', styleName:'Dragon', accent:'#b53b2f', soft:'#fde9e6', deco:['🔥','🪨','🥚'], characters:['Ember','Draco','Spark'], who:'dragon rider', items:['fire gems','dragon eggs','scales'], hint:'Roar into dragon maths.' },
  aliens: { name:'Aliens', emoji:'👽', styleName:'Alien', accent:'#4fa84f', soft:'#eaf8ea', deco:['🛸','🌟','👽'], characters:['Zorp','Blib','Neb'], who:'alien', items:['moon rocks','star dust','space gems'], hint:'Out-of-this-world maths.' },
  mermaids: { name:'Mermaids', emoji:'🧜‍♀️', styleName:'Mermaid', accent:'#2fa8a0', soft:'#e0f8f6', deco:['🐚','🌊','✨'], characters:['Coral','Pearl','Marina'], who:'mermaid', items:['shells','pearls','sea stars'], hint:'Splashy mermaid maths.' },
  ninjas: { name:'Ninjas', emoji:'🥷', styleName:'Ninja', accent:'#2f2f3a', soft:'#ececf0', deco:['⚔️','🌑','🥷'], characters:['Shadow','Blade','Kage'], who:'ninja', items:['shuriken','scrolls','lanterns'], hint:'Stealthy ninja maths.' },
  knights: { name:'Knights', emoji:'🛡️', styleName:'Knight', accent:'#6b6b8a', soft:'#ededf5', deco:['⚔️','🏰','🐉'], characters:['Sir Lance','Gwen','Arthur'], who:'knight', items:['shields','swords','coins'], hint:'Brave knight maths.' },
  princesses: { name:'Princesses', emoji:'👸', styleName:'Princess', accent:'#d66fa8', soft:'#fdeaf4', deco:['👑','🏰','✨'], characters:['Princess Lily','Rose','Belle'], who:'princess', items:['crowns','gems','ribbons'], hint:'Royal maths adventures.' },
  trains: { name:'Trains', emoji:'🚂', styleName:'Train', accent:'#2f6bb5', soft:'#e6f0fc', deco:['🚋','🛤️','🔔'], characters:['Conductor Cal','Choo','Pip'], who:'conductor', items:['tickets','coal','wheels'], hint:'All aboard for maths.' },
  airplanes: { name:'Airplanes', emoji:'✈️', styleName:'Airplane', accent:'#3a8fb5', soft:'#e5f5fd', deco:['🛫','☁️','🧳'], characters:['Pilot Pete','Wings','Sky'], who:'pilot', items:['suitcases','tickets','clouds'], hint:'Fly high with maths.' },
  boats: { name:'Boats', emoji:'⛵', styleName:'Boat', accent:'#2f7fb5', soft:'#e3f2fb', deco:['⚓','🌊','🦀'], characters:['Captain Cal','Sail','Mast'], who:'sailor', items:['ropes','anchors','life rings'], hint:'Sail into maths.' },
  zoo: { name:'Zoo', emoji:'🦓', styleName:'Zoo', accent:'#3a8f5b', soft:'#e5f8ee', deco:['🦒','🐘','🐒'], characters:['Zookeeper Zoe','Roary','Trunk'], who:'zookeeper', items:['tickets','feed','keys'], hint:'A wild zoo maths day.' },
  forest: { name:'Forest', emoji:'🌲', styleName:'Forest', accent:'#2f7a4a', soft:'#e5f5ea', deco:['🍂','🐿️','🍄'], characters:['Forrest','Acorn','Pine'], who:'forest friend', items:['acorns','leaves','mushrooms'], hint:'Forest maths adventures.' },
  mountain: { name:'Mountain', emoji:'🏔️', styleName:'Mountain', accent:'#6b7a8a', soft:'#ededf2', deco:['⛰️','🐐','❄️'], characters:['Climber Kit','Peak','Snow'], who:'mountaineer', items:['ropes','rocks','flags'], hint:'Climb into maths.' },
  bears: { name:'Bears', emoji:'🐻', styleName:'Bear', accent:'#8a6b3a', soft:'#f6eee0', deco:['🍯','🌲','🐾'], characters:['Bruno','Honey','Paws'], who:'bear', items:['honey','berries','fish'], hint:'Bear-y good maths.' },
  foxes: { name:'Foxes', emoji:'🦊', styleName:'Fox', accent:'#c96a2f', soft:'#fdeee4', deco:['🍂','🌲','🦊'], characters:['Foxy','Rusty','Amber'], who:'fox', items:['leaves','berries','acorns'], hint:'Clever fox maths.' },
  pandas: { name:'Pandas', emoji:'🐼', styleName:'Panda', accent:'#2f2f2f', soft:'#ececec', deco:['🎋','🍃','🐼'], characters:['Panda Pop','Bamboo','Dot'], who:'panda', items:['bamboo','leaves','berries'], hint:'Panda maths fun.' },
  owls: { name:'Owls', emoji:'🦉', styleName:'Owl', accent:'#7a5a2f', soft:'#f6eee0', deco:['🌙','🌳','🦉'], characters:['Hoot','Wise','Twig'], who:'owl', items:['feathers','acorns','stars'], hint:'Wise owl maths.' },
  butterflies: { name:'Butterflies', emoji:'🦋', styleName:'Butterfly', accent:'#a84fd6', soft:'#f5e9ff', deco:['🌸','🌼','🦋'], characters:['Flutter','Petal','Wings'], who:'butterfly', items:['flowers','leaves','nectar'], hint:'Fluttery maths fun.' },
  rainbows: { name:'Rainbows', emoji:'🌈', styleName:'Rainbow', accent:'#d64fa2', soft:'#fdeaf6', deco:['☀️','☁️','🌈'], characters:['Sunny','Cloud','Arc'], who:'rainbow friend', items:['colors','stars','clouds'], hint:'Colorful rainbow maths.' },
  birthdays: { name:'Birthdays', emoji:'🎂', styleName:'Birthday', accent:'#d64545', soft:'#fde8e8', deco:['🎈','🎁','🎉'], characters:['Party Pip','Cake','Candle'], who:'party host', items:['balloons','gifts','candles'], hint:'Party maths fun.' },
  science: { name:'Science', emoji:'🔬', styleName:'Science', accent:'#3a6f8f', soft:'#e5f2f8', deco:['🧪','🧬','⚛️'], characters:['Professor Pip','Lab','Atom'], who:'scientist', items:['beakers','atoms','stars'], hint:'Experiment with maths.' },
  camping: { name:'Camping', emoji:'🏕️', styleName:'Camping', accent:'#3f7a4a', soft:'#e8f5e6', deco:['🔥','🌲','⛺'], characters:['Scout','Toast','Pine'], who:'camper', items:['marshmallows','pine cones','fireflies'], hint:'Toast a marshmallow and count the stars.' },
  garden: { name:'Garden', emoji:'🌻', styleName:'Garden', accent:'#4f8f2a', soft:'#eef8e0', deco:['🐝','🌷','🪴'], characters:['Petal','Buzz','Sprout'], who:'gardener', items:['seeds','flowers','ladybugs'], hint:'Plant a little number garden.' },
  detectives: { name:'Detectives', emoji:'🕵️', styleName:'Detective', accent:'#5a5a7a', soft:'#eeeef5', deco:['🔍','🗝️','🕯️'], characters:['Dot','Clue','Sherlock'], who:'detective', items:['clues','magnifying glasses','fingerprints'], hint:'Case files full of number clues.' },
  candy: { name:'Candy', emoji:'🍬', styleName:'Candy', accent:'#d64f8f', soft:'#fdeaf4', deco:['🍭','🍡','🧁'], characters:['Bonbon','Lolly','Sprinkle'], who:'candy maker', items:['sweets','lollipops','gumdrops'], hint:'Sweet counting, no sugar rush.' },
  icecream: { name:'Ice Cream', emoji:'🍦', styleName:'Ice Cream', accent:'#d9895f', soft:'#fdf0e6', deco:['🍧','🍨','🍓'], characters:['Scoop','Cone','Sprinkles'], who:'ice cream seller', items:['scoops','sprinkles','cherries'], hint:'Two scoops of number fun.' },
  cats: { name:'Cats', emoji:'🐱', styleName:'Cat', accent:'#c27a3a', soft:'#fbf0e4', deco:['🐈','🧶','🐾'], characters:['Mochi','Whiskers','Mittens'], who:'cat', items:['yarn balls','fish treats','paw prints'], hint:'Purr-fect counting practice.' },
};

/* =========================================================
   Printable catalogue
   Every age group gets 120 stable, unique recipes:
   5 skills × 6 layouts × 4 themes = 120 sheets per level.
   Each recipe has a fixed seed, so its print page always
   produces the same worksheet.
   ========================================================= */

const ACTIVITY_INFO = {
  prewrite: { label: 'Pre-writing paths', short: 'Paths', unit: 'paths', icon: '〰️', group: 'Getting ready', description: 'Trace big wavy, zigzag and loop paths.', starter: true },
  colors: { label: 'Colour hunt', short: 'Colours', unit: 'cards', icon: '🎨', group: 'Getting ready', description: 'Count and colour by colour.' },
  samediff: { label: 'Same & different', short: 'Same/diff', unit: 'rows', icon: '👀', group: 'Getting ready', description: 'Circle the picture that is different.' },
  position: { label: 'Position words', short: 'Position', unit: 'scenes', icon: '🧭', group: 'Getting ready', description: 'Above, below, beside, in front, inside.' },
  sortcolor: { label: 'Sorting bins', short: 'Sorting', unit: 'sorts', icon: '🧺', group: 'Getting ready', description: 'Sort pictures into two friendly bins.' },
  dots: { label: 'Count & colour dots', short: 'Dots', unit: 'cards', icon: '⚫', group: 'Early skills', description: 'Count the dots, then colour that many.' },
  numberhunt: { label: 'Number hunt', short: 'Hunt', unit: 'hunts', icon: '🔍', group: 'Early skills', description: 'Find and circle every matching number.' },
  maketen: { label: 'Make ten', short: 'Make 10', unit: 'frames', icon: '🔟', group: 'Number sense', description: 'How many more to make ten?', starter: true },
  teen: { label: 'Teen numbers', short: 'Teens', unit: 'numbers', icon: '🔢', group: 'Number sense', description: 'See ten and some more.' },
  measure: { label: 'Longer & shorter', short: 'Measure', unit: 'pairs', icon: '📏', group: 'Measurement & data', description: 'Compare length, height and size.' },
  symmetry: { label: 'Symmetry', short: 'Symmetry', unit: 'shapes', icon: '🦋', group: 'Geometry', description: 'Finish the mirror half of each shape.' },
  shapesort: { label: 'Flat or solid?', short: '2D/3D', unit: 'sorts', icon: '🧊', group: 'Geometry', description: 'Sort flat and solid shapes.' },
  counton: { label: 'Count on', short: 'Count on', unit: 'hops', icon: '👣', group: 'Operations', description: 'Start at a number and hop forward.' },
  numberorder: { label: 'Number order', short: 'Order', unit: 'rows', icon: '↕️', group: 'Number sense', description: 'Put numbers in order and fill the gaps.' },
  patternsnum: { label: 'Number patterns', short: 'Num patterns', unit: 'patterns', icon: '🔁', group: 'Number sense', description: 'Spot the rule and keep it going.' },
  balance: { label: 'Balance the equation', short: 'Balance', unit: 'problems', icon: '⚖️', group: 'Operations', description: 'Make both sides equal.', starter: true },
  measureunits: { label: 'Measure with units', short: 'Units', unit: 'objects', icon: '🧱', group: 'Measurement & data', description: 'Measure pictures with cubes.' },
  fractionsset: { label: 'Fractions of a group', short: 'Fractions', unit: 'groups', icon: '🍪', group: 'Geometry', description: 'Shade and name part of a set.' },
  moreless: { label: 'Ten more, ten less', short: '10 more/less', unit: 'numbers', icon: '↔️', group: 'Number sense', description: 'Hop ten forward and ten back.' },
  trace: { label: 'Number tracing', short: 'Tracing', unit: 'numbers', icon: '✏️', group: 'Early skills', description: 'Trace dashed digits, then write them alone.', starter: true },
  count: { label: 'Counting', short: 'Counting', unit: 'cards', icon: '🔢', group: 'Early skills', description: 'Count pictures and write the total.' },
  shapes: { label: 'Shapes & counting', short: 'Shapes', unit: 'groups', icon: '🔷', group: 'Early skills', description: 'Count shapes in each group.' },
  compare: { label: 'Size comparison', short: 'Size', unit: 'pairs', icon: '📏', group: 'Early skills', description: 'Circle the bigger or smaller picture.' },
  patterns: { label: 'Patterns', short: 'Patterns', unit: 'patterns', icon: '🎨', group: 'Early skills', description: 'Continue a repeating picture pattern.' },
  tenframe: { label: 'Ten-frames', short: 'Ten-frames', unit: 'frames', icon: '🔟', group: 'Early skills', description: 'Count dots in a ten-frame.' },
  dice: { label: 'Dice count', short: 'Dice', unit: 'cards', icon: '🎲', group: 'Early skills', description: 'Roll two dice and add the pips.' },
  sort: { label: 'Sort & count', short: 'Sort', unit: 'mats', icon: '🧺', group: 'Early skills', description: 'Sort shapes and count each kind.' },
  'mixed-prek': { label: 'Mixed pre-K', short: 'Mixed', unit: 'tasks', icon: '🌟', group: 'Early skills', description: 'A little tracing plus a little counting.', starter: true },
  add10: { label: 'Addition to 10', short: 'Addition', unit: 'problems', icon: '➕', group: 'Operations', description: 'Single-digit sums within 10.' },
  sub10: { label: 'Subtraction to 10', short: 'Subtraction', unit: 'problems', icon: '➖', group: 'Operations', description: 'Take-away facts within 10.' },
  mixed10: { label: 'Add & subtract to 10', short: 'Mixed', unit: 'problems', icon: '±', group: 'Operations', description: 'A mixed set of facts to 10.' },
  bonds: { label: 'Number bonds', short: 'Bonds', unit: 'bonds', icon: '🔗', group: 'Number sense', description: 'Find the missing part of a bond.' },
  tally: { label: 'Tally marks', short: 'Tally', unit: 'cards', icon: '🖐️', group: 'Number sense', description: 'Count tally marks and write the number.' },
  addpics: { label: 'Picture addition', short: 'Pic add', unit: 'problems', icon: '🍎', group: 'Operations', description: 'Add groups of pictures.' },
  subpics: { label: 'Cross-out subtraction', short: 'Pic sub', unit: 'problems', icon: '❌', group: 'Operations', description: 'Cross out and count what is left.' },
  doubles: { label: 'Doubles facts', short: 'Doubles', unit: 'problems', icon: '✨', group: 'Operations', description: 'Double facts like 4 + 4.' },
  beforeafter: { label: 'One more, one less', short: 'Before/after', unit: 'cards', icon: '↔️', group: 'Number sense', description: 'Write the number before and after.' },
  skipcount: { label: 'Skip counting', short: 'Skip count', unit: 'sequences', icon: '🦘', group: 'Number sense', description: 'Count by 2s, 5s and 10s.' },
  greater: { label: 'Greater / less / equal', short: 'Compare', unit: 'pairs', icon: '⚖️', group: 'Number sense', description: 'Choose >, < or =.' },
  place: { label: 'Tens & ones', short: 'Tens/ones', unit: 'numbers', icon: '🧱', group: 'Number sense', description: 'Read base-ten blocks.' },
  ordinal: { label: 'Ordinal numbers', short: 'Ordinals', unit: 'rows', icon: '🥇', group: 'Number sense', description: 'Find the position of a picture.' },
  numberline: { label: 'Number line hops', short: 'Number line', unit: 'hops', icon: '📈', group: 'Number sense', description: 'Hop forward on a number line.' },
  numberwords: { label: 'Number words', short: 'Words', unit: 'numbers', icon: '🔤', group: 'Number sense', description: 'Write the number word.' },
  add20: { label: 'Addition to 20', short: 'Addition', unit: 'problems', icon: '🚀', group: 'Operations', description: 'Addition facts within 20.' },
  sub20: { label: 'Subtraction to 20', short: 'Subtraction', unit: 'problems', icon: '🪂', group: 'Operations', description: 'Subtraction facts within 20.' },
  mixed20: { label: 'Mixed facts to 20', short: 'Mixed', unit: 'problems', icon: '🧠', group: 'Operations', description: 'A mixed set of facts to 20.' },
  missing: { label: 'Missing numbers', short: 'Missing', unit: 'problems', icon: '❓', group: 'Operations', description: 'Find the missing number.' },
  word: { label: 'Word problems', short: 'Word problems', unit: 'stories', icon: '📖', group: 'Stories', description: 'Read and solve little stories.' },
  place100: { label: 'Place value to 100', short: 'Place value', unit: 'numbers', icon: '🏢', group: 'Number sense', description: 'Break a number into tens and ones.' },
  evenodd: { label: 'Even & odd', short: 'Even/odd', unit: 'numbers', icon: '🎯', group: 'Number sense', description: 'Sort numbers into even and odd.' },
  fractions: { label: 'Fractions', short: 'Fractions', unit: 'shapes', icon: '🍕', group: 'Geometry', description: 'Name a fraction from a picture.' },
  time: { label: 'Telling time', short: 'Time', unit: 'clocks', icon: '🕐', group: 'Measurement & data', description: 'Read an analog clock.' },
  money: { label: 'Coins & money', short: 'Money', unit: 'purses', icon: '🪙', group: 'Measurement & data', description: 'Count coins and find the total.' },
  factfamily: { label: 'Fact families', short: 'Fact family', unit: 'families', icon: '🏠', group: 'Operations', description: 'Write the four related facts.' },
  threeadd: { label: 'Add three numbers', short: '3 addends', unit: 'problems', icon: '➕➕', group: 'Operations', description: 'Add three numbers together.' },
  twodigit: { label: 'Two-digit practice', short: '2-digit', unit: 'problems', icon: '🔢', group: 'Operations', description: 'Add and subtract two-digit numbers.' },
  arrays: { label: 'Arrays', short: 'Arrays', unit: 'arrays', icon: '🔲', group: 'Geometry', description: 'Repeated addition from a dot array.' },
  graph: { label: 'Picture graphs', short: 'Graphs', unit: 'questions', icon: '📊', group: 'Measurement & data', description: 'Read a picture graph.' },
  rounding: { label: 'Round to ten', short: 'Rounding', unit: 'numbers', icon: '⭕', group: 'Number sense', description: 'Round a number to the nearest ten.' },
  shapes3d: { label: '3D shapes', short: '3D shapes', unit: 'shapes', icon: '🧊', group: 'Geometry', description: 'Name a solid shape.' },
};

const CATALOG_PLAN = {
  prek: ['prewrite', 'trace', 'colors', 'count', 'shapes', 'compare', 'patterns', 'numberhunt', 'samediff', 'mixed-prek'],
  k: ['add10', 'sub10', 'mixed10', 'maketen', 'bonds', 'tally', 'teen', 'counton', 'measure', 'shapesort'],
  g1: ['add20', 'sub20', 'mixed20', 'missing', 'word', 'balance', 'place100', 'money', 'time', 'fractionsset'],
};

const LEVEL_PLAN = {
  prek: ['prewrite', 'trace', 'colors', 'count', 'dots', 'shapes', 'compare', 'patterns', 'numberhunt', 'samediff', 'position', 'sortcolor', 'tenframe', 'mixed-prek'],
  k: ['count', 'add10', 'sub10', 'mixed10', 'maketen', 'bonds', 'tally', 'teen', 'doubles', 'beforeafter', 'counton', 'numberorder', 'numberwords', 'patternsnum', 'measure', 'shapesort', 'symmetry', 'graph'],
  g1: ['add20', 'sub20', 'mixed20', 'missing', 'word', 'place100', 'evenodd', 'fractions', 'time', 'money', 'factfamily', 'threeadd', 'twodigit', 'arrays', 'graph', 'rounding', 'shapes3d', 'numberline', 'numberwords', 'balance', 'moreless', 'measureunits', 'fractionsset', 'symmetry', 'patternsnum'],
};

const ACTIVITY_GROUPS = ['Getting ready', 'Early skills', 'Number sense', 'Operations', 'Measurement & data', 'Geometry', 'Stories'];

// 10 skills × 3 layouts × 6 themes = 180 stable recipes per age group.
const CATALOG_THEMES = ['dinos', 'space', 'monsters', 'ocean', 'unicorns', 'safari'];

const TITLE_PATTERNS = {
  trace: ['Trace & Race', 'Rainbow Tracing', 'Pencil Parade', 'Number Trail', 'Write It, Trace It', 'Trace & Try'],
  count: ['Count the Critters', 'Count & Write', 'How Many?', 'Count the Crew', 'Spot & Count', 'Count the Collection'],
  shapes: ['Shape Safari', 'Shape Count', 'Shape Spotter', 'Shape Detective', 'Shape Party', 'Sort & Count'],
  compare: ['Big or Small?', 'Compare the Critters', 'Which One?', 'Size Safari', 'Big & Little', 'Look & Compare'],
  'mixed-prek': ['Trace, Count & Play', 'Little Learners', 'Pencil Warm-Up', 'Trace & Count', 'Warm-Up Wonders', 'Ready, Set, Count'],
  add10: ['Add It Up!', 'Sum Squad', 'Addition Adventures', 'Add & Write', 'Winning Sums', 'Add It Together'],
  sub10: ['Take It Away!', 'Subtract & Smile', 'Take-Away Time', 'Minus Magic', 'Subtraction Stars', 'How Many Left?'],
  mixed10: ['Add & Subtract', 'Plus & Minus', 'Mixed-Up Facts', 'Math Shuffle', 'Add or Subtract?', 'Fact Family Fun'],
  bonds: ['Number Bond Buddies', 'Bond Builders', 'Whole & Parts', 'Bond Detective', 'Find the Missing Part', 'Number Bonds'],
  tally: ['Tally Up!', 'Tally Time', 'Count the Tallies', 'Tally Tracker', 'Tally Marks', 'Tally & Write'],
  add20: ['Super Sums to 20', 'Addition Cadets', 'Sum It Up', 'Big Sums', 'Add to 20', 'Twenty and Below'],
  sub20: ['Subtraction Cadets', 'Take Away to 20', 'Minus Mission', 'Subtraction Station', 'Find the Difference', 'Subtract to 20'],
  mixed20: ['Math Facts Mission', 'Mixed Practice', 'Fact Fluency Fun', 'Add, Subtract & Solve', 'Grade One Shuffle', 'Math Adventure'],
  missing: ['Missing Number Mysteries', 'Find the Missing Number', 'Number Detectives', "What's Missing?", 'Mystery Numbers', 'Secret Number Search'],
  word: ['Word Problem Wizards', 'Story Problem Studio', 'Math Stories', 'Read & Solve', 'Story Sums', 'Word Problem Workshop'],
  patterns: ['Pattern Parade', 'What Comes Next?', 'Spot the Pattern', 'Pattern Power', 'Repeat After Me', 'Pattern Party'],
  maketen: ['Make Ten Magic', 'Ten-Frame Friends', 'How Many More?', 'Ten Ways', 'Fill the Frame', 'Make a Ten'],
  balance: ['Balance the Equation', 'Equal Sides', 'Weigh It Up', 'The Balance Challenge', 'Same Both Sides', 'Equation Balance'],
  prewrite: ['Path Party', 'Squiggle Trails', 'Trace & Travel'],
  colors: ['Colour Hunt', 'Colour Count', 'Rainbow Count'],
  numberhunt: ['Number Hunt', 'Find the Number', 'Number Detective'],
  samediff: ['Same or Different?', 'Spot the Odd One', 'Look Closely'],
  teen: ['Teen Number Trail', 'Ten and Some More', 'Teen Number Treasure'],
  counton: ['Count On!', 'Hop Forward', 'Counting Hops'],
  measure: ['Longer or Shorter?', 'Size Safari', 'Compare & Circle'],
  shapesort: ['Flat or Solid?', '2D or 3D?', 'Shape Sort'],
  fractionsset: ['Fraction Fair Shares', 'Shade the Fraction', 'Fraction Friends'],
  place100: ['Place Value to 100', 'Tens & Ones', 'Build the Number'],
  money: ['Coin Count', 'Purse Math', 'Money Match'],
  time: ['Telling Time', 'Clock Watch', 'What Time Is It?'],
};

const BLURB_PATTERNS = {
  trace: [
    'Big dashed numbers to trace, then plenty of room to try each one alone.',
    'A gentle tracing warm-up that builds pencil control one number at a time.',
    'Follow the dashes, then finish the row with your very own numbers.',
    'A tidy number trail for little hands learning how digits are formed.',
    'Trace first, write second — a calm, confident number-writing workout.',
    'A full page of tracing practice with a friendly theme to keep it fun.',
  ],
  count: [
    'Count the pictures in each box, then write the matching number.',
    'A bright counting page with room for big, bold numbers.',
    'Count the friendly pictures and practise writing each total.',
    'One-to-one counting practice with a playful theme on every card.',
    'How many can you find? Count each group and fill in the box.',
    'A collection of counting cards that grows confidence with every row.',
  ],
  shapes: [
    'Spot circles, squares, triangles and stars, then count each group.',
    'A shape-spotting page that mixes counting with visual discrimination.',
    'Count the shapes in every card and write the total in the box.',
    'Shape recognition and counting practice in one colourful page.',
    'A shape detective challenge with friendly groups to count.',
    'Sort, spot and count the shapes hiding on every card.',
  ],
  compare: [
    'Circle the bigger friend in each pair — or the smaller one!',
    'A look-and-think page that builds size vocabulary and visual skills.',
    'Which one is bigger? Which one is smaller? Circle your answer.',
    'Compare each pair carefully and circle the picture that matches.',
    'A gentle size-comparison challenge with big, clear pictures.',
    'Look closely, compare the pair, and circle the right one.',
  ],
  'mixed-prek': [
    'A little tracing and a little counting — the perfect pre-K warm-up.',
    'Two friendly activities in one: trace the numbers, then count the pictures.',
    'A gentle mixed page that practises pencil control and one-to-one counting.',
    'Trace first, count second. A balanced little learners workout.',
    'A happy mix of number tracing and count-and-write practice.',
    'A ready-to-go pre-K page that warms up hands and counting brains.',
  ],
  add10: [
    'Friendly single-digit sums with plenty of space to write answers.',
    'A bright addition page for facts with sums of 10 or less.',
    'Add the two numbers and write each answer in the box.',
    'Simple addition practice that builds speed and confidence.',
    'A full set of friendly addition facts to 10.',
    'Add it up! Big numbers, clear boxes and no pressure.',
  ],
  sub10: [
    'Simple take-away facts that build confidence with small numbers.',
    'Subtraction practice within 10, with space to show every answer.',
    'Take the second number away and write what is left.',
    'A friendly first subtraction page with facts from 10 and below.',
    'Cross out, count what remains, and write the answer.',
    'A calm introduction to subtraction with small, friendly numbers.',
  ],
  mixed10: [
    'Addition and subtraction with friendly numbers up to 10.',
    'A balanced mix of plus and minus facts within 10.',
    'Add or subtract? Read the sign carefully, then write the answer.',
    'A shuffled set of addition and subtraction facts to 10.',
    'Keep both operations sharp with this mixed practice page.',
    'Plenty of plus and minus practice with numbers up to 10.',
  ],
  bonds: [
    'Find the missing part in each friendly number bond.',
    'The whole is at the top. Work out the part that is hiding below.',
    'A number-bond workout that builds part-part-whole thinking.',
    'Find the missing part and complete every bond.',
    'Whole numbers, missing parts and lots of good thinking.',
    'A page of number bonds to grow fact fluency and number sense.',
  ],
  tally: [
    'Count the tally marks in each box and write the matching number.',
    'Tally practice with bundles of five and friendly picture-free cards.',
    'Read the tallies, count carefully, and write each total.',
    'A tidy tally-mark page for quick counting and number writing.',
    'Count the groups of five, then add the leftovers.',
    'Tally up! A calm counting page with marks instead of pictures.',
  ],
  add20: [
    'A galaxy of addition facts with sums all the way up to 20.',
    'Addition practice to 20 with big numbers and clear answer boxes.',
    'Add carefully — every answer is 20 or less.',
    'A full page of grade-one addition facts to build fluency.',
    'Big-kid addition practice with sums up to 20.',
    'Add the numbers, show your thinking, and write the total.',
  ],
  sub20: [
    'Take-away practice with numbers up to 20 — no borrowing needed.',
    'Subtraction facts within 20 with plenty of room to work.',
    'Subtract the second number from the first and write the answer.',
    'A grade-one subtraction page that builds speed and confidence.',
    'Find the difference in every fact, all within 20.',
    'Calm, clear subtraction practice for numbers up to 20.',
  ],
  mixed20: [
    'A themed adventure in addition, subtraction and missing numbers.',
    'A balanced grade-one mix of plus, minus and missing-number facts.',
    'Solve every fact and watch for the sneaky dashed boxes.',
    'Mixed math facts to 20 for a confident, capable first grader.',
    'Add, subtract and find the missing number — all on one page.',
    'A shuffled set of grade-one facts with sums and differences to 20.',
  ],
  missing: [
    'Some numbers have disappeared! Use what you know to find them.',
    'A sneaky number has vanished from every equation. Can you find it?',
    'Find the missing number and write it in the dashed box.',
    'Missing addends and subtrahends to build real number sense.',
    'Use the answer to work backwards and uncover each hidden number.',
    'A number-detective page full of missing-number puzzles.',
  ],
  word: [
    'Eight splashy story problems with space to show the answer.',
    'Read each little story, then work out the answer.',
    'A page of short math stories that mix addition and subtraction.',
    'Read, think, and solve — with room to draw your thinking.',
    'Friendly story problems that connect reading with math.',
    'A word-problem workshop with space to show every answer.',
  ],
  patterns: [
    'Look closely, spot the repeat, then finish the pattern.',
    'A gentle pattern page that builds early algebra thinking.',
    'Can you work out what comes next? Colour and draw to finish.',
    'Repeating patterns with friendly pictures and big thinking spaces.',
    'Spot the rule, then keep the pattern going to the end of the row.',
    'A colourful pattern parade for growing mathematical eyes.',
  ],
  maketen: [
    'See how many dots are in the frame, then work out how many more make ten.',
    'A ten-frame workout that builds the all-important make-ten fact.',
    'How many more to make ten? Count the empty spaces to help.',
    'Fill the frame to ten and grow real number sense.',
    'Ten-frame practice that turns counting into thinking.',
    'A friendly make-ten page with picture support on every card.',
  ],
  balance: [
    'Make both sides equal by finding the missing number.',
    'A balance challenge that turns equations into puzzles.',
    'One side is complete. Work out what the other side needs.',
    'Think of the equals sign as “the same as”, then solve each balance.',
    'Balancing equations builds flexible, confident mathematicians.',
    'Find the missing number that keeps each equation balanced.',
  ],
  prewrite: [
    'Trace big wavy, zigzag and loop paths from one friend to another.',
    'A fine-motor warm-up that builds the strokes behind early letter writing.',
    'Start at the big dot and follow each dotted trail to the end.',
  ],
  colors: [
    'Count the shapes in each colour, then write how many you found.',
    'A bright colour-matching page that pairs naming with one-to-one counting.',
    'Look at the swatch, count the matching shapes, and write the total.',
  ],
  numberhunt: [
    'Circle every matching numeral in the grid, then count how many you found.',
    'A number-recognition hunt with a friendly picture theme.',
    'Look closely! The same number is hiding all over this page.',
  ],
  samediff: [
    'Look closely and circle the picture that is different in each row.',
    'A visual-discrimination page that builds same and different vocabulary.',
    'Which one does not belong? Circle the odd picture in every row.',
  ],
  teen: [
    'See ten and some more. Write the ones that make each teen number.',
    'Ten-frames make teen numbers visible, concrete and easy to compare.',
    'Each teen number is one ten plus some ones. Fill in the missing part.',
  ],
  counton: [
    'Start at the number, hop forward on the line, and write where you land.',
    'A count-on page that turns addition into movement along a number line.',
    'Count on with the hops. Then write the landing number.',
  ],
  measure: [
    'Compare the pictures and circle the longer, shorter or taller one.',
    'A size-comparison page that builds measurement vocabulary.',
    'Look carefully at each pair, then circle the one the question asks for.',
  ],
  shapesort: [
    'Sort flat and solid shapes into two clear groups.',
    'A shape-sorting page that builds 2D and 3D vocabulary.',
    'Is it flat or solid? Sort every shape into the right bin.',
  ],
  fractionsset: [
    'Look at the shaded part of each group and write the fraction.',
    'Fair shares made visual: name the fraction that is shaded.',
    'A gentle introduction to fractions of a set.',
  ],
  place100: [
    'Break each number into tens and ones.',
    'A place-value page that builds two-digit number sense.',
    'How many tens? How many ones? Write each part.',
  ],
  money: [
    'Count the coins in each purse and write the total.',
    'A coin-counting page that mixes small values for real addition practice.',
    'Add the coins carefully, then write the total value.',
  ],
  time: [
    'Read each clock and write the time, on the hour and half hour.',
    'A clock-reading page with clear analogue faces.',
    'Where are the hands pointing? Write the time.',
  ],
};

const PROBLEM_SETS = [5, 10, 15, 20, 10, 15];
const TRACE_RANGES = [[1, 5], [6, 10], [1, 10], [0, 9], [2, 7], [4, 10]];
const MIXED_RANGES = [[1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]];

const SPECIAL_COUNTS = {
  trace: (pattern) => TRACE_RANGES[pattern][1] - TRACE_RANGES[pattern][0] + 1,
  'mixed-prek': (pattern) => [5, 10, 15, 10, 5, 10][pattern],
  bonds: (pattern) => [8, 10, 12, 10, 15, 20][pattern],
  tally: (pattern) => [8, 10, 12, 15, 10, 20][pattern],
  word: (pattern) => [5, 6, 7, 8, 6, 7][pattern],
};

function problemCountFor(activity, pattern) {
  if (SPECIAL_COUNTS[activity]) return SPECIAL_COUNTS[activity](pattern);
  return PROBLEM_SETS[pattern];
}

function countLabelFor(entry) {
  if (entry.activity === 'trace') return `Numbers ${entry.range[0]}–${entry.range[1]}`;
  if (entry.activity === 'mixed-prek') return 'Trace + count';
  const unit = ACTIVITY_INFO[entry.activity].unit;
  return `${entry.problems} ${unit}`;
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function buildCatalog() {
  const entries = [];
  const counters = { prek: 0, k: 0, g1: 0 };

  Object.entries(CATALOG_PLAN).forEach(([category, activities]) => {
    activities.forEach((activity) => {
      const info = ACTIVITY_INFO[activity];
      for (let pattern = 0; pattern < 3; pattern += 1) {
        for (let themeIndex = 0; themeIndex < CATALOG_THEMES.length; themeIndex += 1) {
          const themeKey = CATALOG_THEMES[themeIndex];
          const theme = THEMES[themeKey];
          const problems = Math.min(problemCountFor(activity, pattern), DIFFICULTIES[category].maxProblems);
          const range = activity === 'trace'
            ? TRACE_RANGES[pattern]
            : activity === 'mixed-prek'
              ? MIXED_RANGES[pattern]
              : null;
          const suffix = String(pattern * CATALOG_THEMES.length + themeIndex + 1).padStart(2, '0');
          counters[category] += 1;

          const entry = {
            id: `${category}-${activity}-${suffix}`,
            number: counters[category],
            category,
            activity,
            title: `${theme.styleName} ${(TITLE_PATTERNS[activity] || ['Practice'])[pattern % (TITLE_PATTERNS[activity] || ['Practice']).length]}`,
            problems,
            theme: themeKey,
            seed: hashSeed(`${category}|${activity}|${pattern}|${themeKey}|catalog-v2`),
            tags: [info.label, countLabelFor({ activity, problems, range })],
            blurb: `${theme.styleName} edition. ${(BLURB_PATTERNS[activity] || ['A themed practice page.'])[pattern % (BLURB_PATTERNS[activity] || ['A themed practice page.']).length]}`,
          };

          if (range && activity === 'trace') {
            entry.range = range;
            entry.subtitle = `Trace the numbers from ${range[0]} to ${range[1]}, then try writing them all alone.`;
          } else if (range) {
            entry.range = range;
          }

          entries.push(entry);
        }
      }
    });
  });

  return entries;
}

const CATALOG = buildCatalog();
const CATALOG_BY_CATEGORY = {
  prek: CATALOG.filter((entry) => entry.category === 'prek'),
  k: CATALOG.filter((entry) => entry.category === 'k'),
  g1: CATALOG.filter((entry) => entry.category === 'g1'),
};
const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((entry) => [entry.id, entry]));

function catalogFor(category) {
  return CATALOG_BY_CATEGORY[category] || [];
}

function findSheet(id) {
  return CATALOG_BY_ID[id] || null;
}

function activitiesFor(category) {
  return CATALOG_PLAN[category] || [];
}

function generatorActivitiesFor(category) {
  return LEVEL_PLAN[category] || [];
}

/* =========================================================
   Tiny seeded random number generator
   Same seed -> same worksheet. Different seed -> new sheet.
   ========================================================= */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  const random = mulberry32(seed || 1);
  return {
    next: random,
    int(min, max) {
      return Math.floor(random() * (max - min + 1)) + min;
    },
    pick(list) {
      return list[Math.floor(random() * list.length)];
    },
    chance(probability) {
      return random() < probability;
    },
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

function randomSeed() {
  return Math.floor(Math.random() * 2147483646) + 1;
}

/* =========================================================
   Shared HTML helpers
   ========================================================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function brandSquiggle(size = 30) {
  return `<svg viewBox="0 0 52 52" width="${size}" height="${size}" fill="none" aria-hidden="true">
    <rect width="52" height="52" rx="14" fill="${'#ffd447'}"/>
    <path d="M8 31c7-18 12 11 19-6s10 11 18-4" stroke="#1f2a44" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

function dashedGlyph(number, className = 'trace-glyph') {
  const text = String(number);
  const fontSize = text.length > 1 ? 46 : 58;
  return `<svg class="${className}" viewBox="0 0 70 70" aria-hidden="true">
    <text x="35" y="56" text-anchor="middle" font-family="Quicksand, sans-serif" font-weight="700"
      font-size="${fontSize}" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-dasharray="4 3.4" stroke-linecap="round">${text}</text>
  </svg>`;
}

const SHAPE_COLORS = ['accent', 'pink', 'blue', 'yellow'];

function shapeSvg(kind, colorIndex = 0) {
  const colorToken = SHAPE_COLORS[colorIndex % SHAPE_COLORS.length];
  const color = colorToken === 'accent'
    ? 'var(--ws-accent)'
    : colorToken === 'pink'
      ? '#e8559c'
      : colorToken === 'blue'
        ? '#268fbf'
        : '#e8a70f';
  if (kind === 'circle') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="${color}"/></svg>`;
  }
  if (kind === 'square') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="2" fill="${color}"/></svg>`;
  }
  if (kind === 'triangle') {
    return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 22 21H2z" fill="${color}"/></svg>`;
  }
  return `<svg class="ws-shape" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1.8 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z" fill="${color}"/></svg>`;
}

/* =========================================================
   Question generators
   ========================================================= */

function defaultActivityFor(difficulty) {
  if (difficulty === 'prek') return 'mixed-prek';
  if (difficulty === 'k') return 'mixed10';
  return 'mixed20';
}

function defaultTitle(activity, theme) {
  const titles = {
    'mixed-prek': `${theme.styleName} Trace & Count`,
    trace: 'Trace & Write',
    prewrite: `${theme.styleName} Path Party`,
    colors: 'Colour Hunt',
    samediff: 'Same or Different?',
    position: 'Where Is It?',
    numberhunt: 'Number Hunt',
    dots: 'Dot Counting',
    sortcolor: 'Sort into the Bins',
    maketen: 'Make Ten Magic',
    teen: 'Teen Number Trail',
    measure: 'Longer or Shorter?',
    symmetry: 'Mirror Magic',
    shapesort: 'Flat or Solid?',
    counton: 'Count On!',
    numberorder: 'Number Order',
    patternsnum: 'Number Patterns',
    balance: 'Balance the Equation',
    measureunits: 'Measure with Cubes',
    fractionsset: 'Fraction Fair Shares',
    moreless: 'Ten More, Ten Less',
    count: 'Count & Write',
    shapes: 'Shape Count',
    compare: 'Big or Small?',
    patterns: `${theme.styleName} Pattern Parade`,
    tenframe: 'Ten-Frame Count',
    dice: 'Dice Roll Math',
    sort: 'Sort & Count',
    mixed10: `${theme.styleName} Add & Subtract`,
    add10: 'Add It Up!',
    sub10: 'Take It Away!',
    bonds: 'Number Bond Buddies',
    tally: 'Tally Up!',
    addpics: 'Picture Addition',
    subpics: 'Cross-Out Subtraction',
    doubles: 'Doubles Fun',
    beforeafter: 'One More, One Less',
    skipcount: 'Skip Counting',
    greater: 'Greater, Less or Equal?',
    place: 'Tens & Ones',
    ordinal: 'Ordinal Numbers',
    numberline: 'Number Line Hops',
    numberwords: 'Number Words',
    mixed20: `${theme.styleName} Math Facts`,
    add20: 'Super Sums to 20',
    sub20: 'Subtraction Practice',
    missing: 'Missing Number Mysteries',
    word: 'Word Problem Wizards',
    place100: 'Place Value to 100',
    evenodd: 'Even or Odd?',
    fractions: 'Fraction Fun',
    time: 'Telling Time',
    money: 'Coin Count',
    factfamily: 'Fact Families',
    threeadd: 'Add Three Numbers',
    twodigit: 'Two-Digit Practice',
    arrays: 'Arrays & Repeated Addition',
    graph: 'Picture Graph',
    rounding: 'Round to Ten',
    shapes3d: '3D Shape Spotter',
  };
  return titles[activity] || 'SquiggleMath Worksheet';
}

function defaultSubtitle(activity, theme) {
  const subtitles = {
    'mixed-prek': 'Trace the numbers, then count each group.',
    trace: 'Follow the dashed numbers, then try writing them on your own.',
    prewrite: 'Trace each path from the dot to the picture at the end.',
    colors: 'Count the shapes in each colour, then write how many.',
    samediff: 'Look closely. Circle the picture that is different.',
    position: 'Use the position word to find the right picture.',
    numberhunt: 'Circle every matching number in the grid.',
    dots: 'Count the dots. Colour the same number of dots.',
    sortcolor: 'Sort the pictures into the two bins.',
    maketen: 'Count the dots, then work out how many more make ten.',
    teen: 'See ten and some more. Write how many more.',
    measure: 'Look carefully, then circle the longer, shorter or taller one.',
    symmetry: 'Draw the mirror half to finish each shape.',
    shapesort: 'Sort the shapes into flat and solid groups.',
    counton: 'Start at the green dot and hop forward on the number line.',
    numberorder: 'Write the missing number in each row.',
    patternsnum: 'Spot the step, then fill in the missing numbers.',
    balance: 'Find the missing number that makes both sides equal.',
    measureunits: 'Count how many cubes long each picture is.',
    fractionsset: 'Look at the shaded part. Write the fraction.',
    moreless: 'Write ten less and ten more than each number.',
    count: 'Count the pictures and write how many you see.',
    shapes: 'Count each shape group and write the total.',
    compare: 'Look at each pair. Which one is bigger or smaller?',
    patterns: 'Look closely and finish the repeating pattern.',
    tenframe: 'Count the dots in each ten-frame.',
    dice: 'Add the dots on the two dice.',
    sort: 'Sort the shapes, then count each kind.',
    mixed10: 'Addition and subtraction with friendly numbers up to 10.',
    add10: 'Add the numbers and write the answer.',
    sub10: 'Take the second number away from the first.',
    bonds: 'Find the missing part of each number bond.',
    tally: 'Count the tally marks and write the number.',
    addpics: 'Add the groups of pictures.',
    subpics: 'Cross out, then count what is left.',
    doubles: 'Double each number.',
    beforeafter: 'Write the number before and after.',
    skipcount: 'Count by 2s, 5s and 10s.',
    greater: 'Compare the two numbers.',
    place: 'Read the base-ten blocks.',
    ordinal: 'Find the position of the picture.',
    numberline: 'Start, hop and land.',
    numberwords: 'Write the word for each number.',
    mixed20: `A ${theme.name.toLowerCase()} adventure in addition, subtraction, and missing numbers.`,
    add20: 'Add carefully — every answer is 20 or less.',
    sub20: 'Subtract carefully — every answer stays above zero.',
    missing: 'A sneaky number has vanished from each equation. Can you find it?',
    word: 'Read each little story, then work out the answer.',
    place100: 'Break each number into tens and ones.',
    evenodd: 'Sort each number into even or odd.',
    fractions: 'Name the shaded fraction.',
    time: 'Read the time on each clock.',
    money: 'Count the coins and find the total.',
    factfamily: 'Write the four related facts.',
    threeadd: 'Add the three numbers.',
    twodigit: 'Add and subtract two-digit numbers.',
    arrays: 'Turn the array into repeated addition.',
    graph: 'Read the picture graph.',
    rounding: 'Round to the nearest ten.',
    shapes3d: 'Name each solid shape.',
  };
  return subtitles[activity] || 'A little maths adventure from SquiggleMath.';
}

function defaultInstruction(activity) {
  const instructions = {
    'mixed-prek': 'Trace each number. Then count the pictures and write how many in the box.',
    trace: 'Trace each dashed number, then try writing it yourself.',
    prewrite: 'Start at the big dot. Trace each path slowly, then try it again.',
    colors: 'Count the shapes that match the colour swatch. Write the total.',
    samediff: 'Circle the picture that is different from the others in the row.',
    position: 'Read the position word with a grown-up. Circle the matching picture.',
    numberhunt: 'Find and circle every matching number. Count how many you found.',
    dots: 'Count the dots. Colour the same number of dots next to them.',
    sortcolor: 'Look at each picture, then draw it in the correct bin.',
    maketen: 'Count the filled spaces. Write how many empty spaces are left.',
    teen: 'Each teen number is ten and some ones. Write the missing ones.',
    measure: 'Compare the two pictures. Circle the one the question asks for.',
    symmetry: 'Use the dotted line to help you draw the matching half.',
    shapesort: 'Sort the six shapes into flat (2D) and solid (3D) bins.',
    counton: 'Start at the number. Count on the hops. Write where you land.',
    numberorder: 'Write the missing number so the row is in order.',
    patternsnum: 'Work out the step, then write the missing numbers.',
    balance: 'Make both sides the same. Write the missing number.',
    measureunits: 'Count the cubes that match each picture.',
    fractionsset: 'Write the fraction that shows the shaded part of the group.',
    moreless: 'Write ten less and ten more than each number.',
    count: 'Count the pictures in each box. Write the number in the box.',
    shapes: 'Count the shapes in each group. Write the total in the box.',
    compare: 'Read the prompt. Circle the bigger or smaller picture.',
    patterns: 'Look at the pattern. Draw or write what comes next.',
    tenframe: 'Count the dots in each ten-frame. Write the number.',
    dice: 'Add the two dice. Write the total.',
    sort: 'Sort the shapes and count each kind.',
    mixed10: 'Add or subtract. Write each answer in the box.',
    add10: 'Add the numbers. Write each answer in the box.',
    sub10: 'Subtract the numbers. Write each answer in the box.',
    bonds: 'Find the missing part of each number bond.',
    tally: 'Count the tally marks. Write the number in the box.',
    addpics: 'Add the groups of pictures. Write the total.',
    subpics: 'Cross out and count what is left.',
    doubles: 'Double each number. Write the answer.',
    beforeafter: 'Write the number before and after each number.',
    skipcount: 'Fill in the missing numbers in each sequence.',
    greater: 'Write >, < or = between the numbers.',
    place: 'Write how many tens and how many ones.',
    ordinal: 'Find the position of the picture. Write the number.',
    numberline: 'Start at the number and hop forward. Write where you land.',
    numberwords: 'Write the word for each number.',
    mixed20: 'Solve each problem. Then find the missing numbers in the dashed boxes.',
    add20: 'Add the numbers. Write each answer in the box.',
    sub20: 'Subtract the numbers. Write each answer in the box.',
    missing: 'Find the missing number. Write it in the dashed box.',
    word: 'Read the story. Write your answer on the line.',
    place100: 'Write the tens and ones for each number.',
    evenodd: 'Circle even or odd for each number.',
    fractions: 'Write the fraction that is shaded.',
    time: 'Write the time shown on each clock.',
    money: 'Count the coins. Write the total.',
    factfamily: 'Write the four related facts.',
    threeadd: 'Add the three numbers. Write the answer.',
    twodigit: 'Add or subtract. Write each answer.',
    arrays: 'Write the repeated addition and the total.',
    graph: 'Answer each question about the graph.',
    rounding: 'Round each number to the nearest ten.',
    shapes3d: 'Write the name of each solid shape.',
  };
  return instructions[activity] || '';
}

function makeFactPool(operation, maxNumber) {
  const pool = [];

  if (operation === 'add') {
    for (let a = 1; a < maxNumber; a += 1) {
      for (let b = 1; b <= maxNumber - a; b += 1) {
        pool.push({ a, b, op: '+', result: a + b, answer: a + b, missing: null });
      }
    }
    return pool;
  }

  for (let a = 3; a <= maxNumber; a += 1) {
    for (let b = 1; b <= a - 2; b += 1) {
      pool.push({ a, b, op: '−', result: a - b, answer: a - b, missing: null });
    }
  }
  return pool;
}

function makeMissingPool(maxNumber) {
  const pool = [];

  for (let result = 4; result <= maxNumber; result += 1) {
    for (let a = 1; a < result; a += 1) {
      pool.push({ a, b: null, op: '+', result, answer: result - a, missing: 'b' });
    }
  }

  for (let a = 5; a <= maxNumber; a += 1) {
    for (let b = 1; b <= a - 2; b += 1) {
      pool.push({ a: null, b, op: '−', result: a - b, answer: a, missing: 'a' });
      pool.push({ a, b: null, op: '−', result: a - b, answer: b, missing: 'b' });
    }
  }

  return pool;
}

/* A queue deals every fact once before reshuffling, so a sheet never
   repeats the same equation while its pool has unused facts left. */
function makeQueue(items, rng) {
  let deck = rng.shuffle(items);
  let index = 0;

  return function next() {
    if (index >= deck.length) {
      deck = rng.shuffle(items);
      index = 0;
    }
    return deck[index++];
  };
}

function takeFromPool(pool, count, rng) {
  const next = makeQueue(pool, rng);
  return Array.from({ length: count }, () => next());
}

function pickWeightedQueue(queues, weights, rng) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < queues.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return queues[i];
  }
  return queues[queues.length - 1];
}

function buildEquationProblems(activity, count, rng) {
  if (activity === 'add10') return takeFromPool(makeFactPool('add', 10), count, rng);
  if (activity === 'sub10') return takeFromPool(makeFactPool('sub', 10), count, rng);
  if (activity === 'add20') return takeFromPool(makeFactPool('add', 20), count, rng);
  if (activity === 'sub20') return takeFromPool(makeFactPool('sub', 20), count, rng);
  if (activity === 'missing') return takeFromPool(makeMissingPool(20), count, rng);

  if (activity === 'mixed10') {
    const nextAdd = makeQueue(makeFactPool('add', 10), rng);
    const nextSub = makeQueue(makeFactPool('sub', 10), rng);
    const startWithAdd = rng.chance(0.5);
    return Array.from({ length: count }, (_, index) => {
      const wantsAdd = (index % 2 === 0) === startWithAdd;
      return wantsAdd ? nextAdd() : nextSub();
    });
  }

  // Mixed grade-one facts: every sheet gets all three formats, then a
  // varied mix of addition, subtraction and missing-number puzzles.
  const queues = [
    makeQueue(makeFactPool('add', 20), rng),
    makeQueue(makeFactPool('sub', 20), rng),
    makeQueue(makeMissingPool(20), rng),
  ];
  const weights = [0.4, 0.4, 0.2];

  return Array.from({ length: count }, (_, index) => {
    if (index < queues.length) return queues[index]();
    return pickWeightedQueue(queues, weights, rng)();
  });
}

/* ---------- content builders ---------- */

function blockTitle(letter, title, hint = '') {
  return `<h2 class="ws-block__title"><span class="ws-block__badge">${letter}</span>${escapeHtml(title)}${hint ? `<span class="ws-block__hint">${escapeHtml(hint)}</span>` : ''}</h2>`;
}

function traceRowMarkup(number, theme, large = false) {
  const copies = large ? 4 : 4;
  return `<div class="trace-row">
    <span class="trace-row__key">${number}</span>
    <span class="trace-row__copies">${Array.from({ length: copies }, () => dashedGlyph(number)).join('')}</span>
    <span class="trace-row__write"></span>
    <span class="trace-row__deco" aria-hidden="true">${theme.emoji}</span>
  </div>`;
}

function traceBlock(numbers, theme, { compact = false, letter = 'A', hint = '' } = {}) {
  return `<section class="ws-block">
    ${blockTitle(letter, 'Trace & write', hint || `${numbers[0]}–${numbers[numbers.length - 1]}`)}
    <div class="trace-grid ${compact ? 'trace-grid--compact' : 'trace-grid--large'}">
      ${numbers.map((number) => traceRowMarkup(number, theme, !compact)).join('')}
    </div>
  </section>`;
}

function countCardMarkup(count, icon) {
  return `<div class="count-card">
    <div class="count-card__emojis" aria-hidden="true">${icon.repeat(count)}</div>
    <div class="count-card__footer">
      <span class="count-card__prompt">How many?</span>
      <span class="count-card__box" aria-hidden="true"></span>
    </div>
  </div>`;
}

function countBlock(items, { dense, roomy, letter = 'A', title = 'Count & write' } = {}) {
  const gridClass = dense ? 'count-grid--dense' : roomy ? 'count-grid--roomy' : '';
  return `<section class="ws-block">
    ${blockTitle(letter, title, `${items.length} groups`)}
    <div class="count-grid ${gridClass}">
      ${items.map((item) => countCardMarkup(item.count, item.icon)).join('')}
    </div>
  </section>`;
}

function makeCountItems(count, theme, rng) {
  const items = [];
  const counts = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const icons = [theme.emoji, theme.emoji, ...theme.deco];
  const nextCount = makeQueue(counts, rng);
  const nextIcon = makeQueue(icons, rng);

  for (let i = 0; i < count; i += 1) {
    items.push({ count: nextCount(), icon: nextIcon() });
  }
  return items;
}

function buildTraceContent(count, theme, rng, range) {
  let start = 1;
  let end = Math.min(Math.max(count, 5), 10);
  if (Array.isArray(range) && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
    start = Math.max(0, range[0]);
    end = Math.min(10, Math.max(start, range[1]));
  }
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const scope = numbers.length === 1 ? `${numbers[0]}` : `${numbers[0]}–${numbers[numbers.length - 1]}`;
  return {
    body: traceBlock(numbers, theme, {
      compact: numbers.length > 7,
      hint: scope,
    }),
    answers: [],
    answersNote: 'Tracing sheets do not need an answer key.',
    count: numbers.length,
  };
}

function buildCountContent(count, theme, rng) {
  const items = makeCountItems(count, theme, rng);
  return {
    body: countBlock(items, {
      roomy: count <= 10,
      dense: count > 10,
      title: 'Count & write',
    }),
    answers: items.map((item) => String(item.count)),
    answersNote: 'Answers are listed in worksheet order.',
    count: items.length,
  };
}

function buildShapesContent(count, theme, rng) {
  const kinds = ['circle', 'square', 'triangle', 'star'];
  const combos = [];

  // Every shape, colour and group size is dealt before repeating.
  kinds.forEach((kind) => {
    for (let shapes = 3; shapes <= 8; shapes += 1) {
      for (let color = 0; color < 4; color += 1) {
        combos.push({ kind, shapes, color });
      }
    }
  });

  const items = takeFromPool(combos, count, rng);

  const body = `<section class="ws-block">
    ${blockTitle('A', 'Shape count', `${count} groups`)}
    <div class="shape-grid ${count > 10 ? 'shape-grid--dense' : ''}">
      ${items.map((item) => `<div class="shape-card">
        <div class="shape-card__shapes" aria-hidden="true">
          ${Array.from({ length: item.shapes }, () => shapeSvg(item.kind, item.color)).join('')}
        </div>
        <div class="shape-card__footer">
          <span class="shape-card__prompt">How many?</span>
          <span class="shape-card__box" aria-hidden="true"></span>
        </div>
      </div>`).join('')}
    </div>
  </section>`;

  return {
    body,
    answers: items.map((item) => String(item.shapes)),
    answersNote: 'Answers show the number of shapes in each card.',
    count: items.length,
  };
}

function buildCompareContent(count, theme, rng) {
  const symbols = [theme.emoji, ...theme.deco];
  const combos = [];

  symbols.forEach((symbol) => {
    [true, false].forEach((withBigFirst) => {
      [true, false].forEach((askBigger) => {
        combos.push({ symbol, withBigFirst, askBigger });
      });
    });
  });

  const nextCombo = makeQueue(combos, rng);
  const cards = [];

  for (let i = 0; i < count; i += 1) {
    const { symbol, withBigFirst, askBigger } = nextCombo();
    const big = `<span class="compare-item compare-item--big" aria-hidden="true">${symbol}</span>`;
    const small = `<span class="compare-item compare-item--small" aria-hidden="true">${symbol}</span>`;
    cards.push(`<div class="compare-card">
      <span class="compare-card__prompt">Circle the <strong>${askBigger ? 'bigger' : 'smaller'}</strong> one</span>
      <span class="compare-card__pair">${withBigFirst ? big + small : small + big}</span>
    </div>`);
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Big or small?', `${count} pairs`)}
      <div class="compare-grid ${count > 10 ? 'compare-grid--dense' : ''}">${cards.join('')}</div>
    </section>`,
    answers: [],
    answersNote: 'Ask your child to explain which picture is bigger or smaller.',
    count: cards.length,
  };
}

function equationMarkup(problem, index) {
  const blank = '<i class="eq-blank eq-blank--missing" aria-hidden="true"></i>';
  const left = problem.missing === 'a' ? blank : problem.a;
  const right = problem.missing === 'b' ? blank : problem.b;
  const showResult = problem.missing !== null && problem.missing !== 'result';
  return `<li class="problem">
    <span class="problem__num">${index + 1}</span>
    <span class="equation"><span>${left}</span><b class="op">${problem.op}</b><span>${right}</span><b class="op">=</b>${showResult ? `<span>${problem.result}</span>` : '<i class="eq-blank" aria-hidden="true"></i>'}</span>
  </li>`;
}

function buildEquationContent(activity, count, theme, rng) {
  const problems = buildEquationProblems(activity, count, rng);
  const titles = {
    mixed10: 'Add & subtract',
    add10: 'Add it up',
    sub10: 'Take it away',
    mixed20: 'Solve & write',
    add20: 'Add it up',
    sub20: 'Subtraction',
    missing: 'Find the missing number',
  };
  const dense = count > 10;

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', titles[activity] || 'Solve & write', `${count} problems`)}
      <ol class="problem-grid ${dense ? 'problem-grid--dense' : ''}">
        ${problems.map(equationMarkup).join('')}
      </ol>
    </section>`,
    answers: problems.map((problem) => String(problem.answer)),
    answersNote: 'Answers are listed in worksheet order.',
    count: problems.length,
  };
}

function bondMarkup(whole, part, missingSide) {
  const showLeft = missingSide === 'right' ? part : null;
  const showRight = missingSide === 'left' ? part : null;
  const valueLeft = showLeft === null
    ? '<text x="42" y="100" text-anchor="middle" fill="#8390a8" font-size="18">?</text>'
    : `<text x="42" y="100" text-anchor="middle">${showLeft}</text>`;
  const valueRight = showRight === null
    ? '<text x="118" y="100" text-anchor="middle" fill="#8390a8" font-size="18">?</text>'
    : `<text x="118" y="100" text-anchor="middle">${showRight}</text>`;
  const leftClass = missingSide === 'left' ? 'bond-blank' : '';
  const rightClass = missingSide === 'right' ? 'bond-blank' : '';

  return `<svg class="bond-svg" viewBox="0 0 160 124" aria-hidden="true">
    <line x1="80" y1="40" x2="42" y2="76"/>
    <line x1="80" y1="40" x2="118" y2="76"/>
    <circle cx="80" cy="30" r="23"/>
    <text x="80" y="37" text-anchor="middle">${whole}</text>
    <circle class="${leftClass}" cx="42" cy="96" r="23"/>
    ${valueLeft}
    <circle class="${rightClass}" cx="118" cy="96" r="23"/>
    ${valueRight}
  </svg>`;
}

function buildBondsContent(count, theme, rng) {
  const pool = [];

  // Deal every whole/part/side combination before repeating any bond.
  for (let whole = 5; whole <= 10; whole += 1) {
    for (let part = 1; part < whole; part += 1) {
      ['left', 'right'].forEach((missingSide) => {
        pool.push({ whole, part, missingPart: whole - part, missingSide });
      });
    }
  }

  const bonds = takeFromPool(pool, count, rng);

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Number bonds', `${count} bonds`)}
      <div class="bond-grid ${count > 10 ? 'bond-grid--dense' : ''}">
        ${bonds.map((bond) => `<div class="bond-card">${bondMarkup(bond.whole, bond.part, bond.missingSide)}</div>`).join('')}
      </div>
    </section>`,
    answers: bonds.map((bond) => String(bond.missingPart)),
    answersNote: 'The answer is the missing part of each number bond.',
    count: bonds.length,
  };
}

function tallyMarks(number) {
  const groups = [];
  let left = number;
  while (left >= 5) {
    groups.push(5);
    left -= 5;
  }
  if (left > 0) groups.push(left);
  return groups.map((size) => `<span class="tally-group ${size === 5 ? 'tally-group--five' : ''}">${'<b></b>'.repeat(size)}</span>`).join('');
}

function buildTallyContent(count, theme, rng) {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const selected = takeFromPool(values, count, rng);

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Tally count', `${count} cards`)}
      <div class="tally-grid ${count > 10 ? 'tally-grid--dense' : ''}">
        ${selected.map((value, index) => `<div class="tally-card">
          <span class="tally-card__num">${index + 1}</span>
          <span class="tally-set" aria-hidden="true">${tallyMarks(value)}</span>
          <span class="tally-card__box" aria-hidden="true"></span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: selected.map(String),
    answersNote: 'Answers are the totals of the tally marks.',
    count: selected.length,
  };
}

function buildWordContent(count, theme, rng) {
  const problems = [];
  const total = Math.min(count, 6);
  const addTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${f} brings ${b} more. How many ${item} are there altogether?`,
    (c, f, a, b, item) => `${c} finds ${a} ${item} in the morning and ${b} in the afternoon. How many ${item} in all?`,
    (c, f, a, b, item) => `There are ${a} ${item} in ${c}'s basket. ${f} adds ${b} more. How many ${item} are there now?`,
    (c, f, a, b, item) => `${c} counts ${a} ${item} on the first page and ${b} on the second. How many ${item} altogether?`,
    (c, f, a, b, item) => `A box has ${a} ${item}. ${f} puts in ${b} more. How many ${item} are in the box now?`,
    (c, f, a, b, item) => `${c} the ${theme.who} spots ${a} ${item} near the door and ${b} near the window. How many ${item} did ${c} spot?`,
  ];
  const subTemplates = [
    (c, f, a, b, item) => `${c} the ${theme.who} has ${a} ${item}. ${b} ${item} are taken away. How many are left?`,
    (c, f, a, b, item) => `${c} spots ${a} ${item}. Then ${b} of them disappear. How many ${item} can ${c} still see?`,
    (c, f, a, b, item) => `A box holds ${a} ${item}. ${f} takes out ${b}. How many ${item} stay in the box?`,
    (c, f, a, b, item) => `${c} the ${theme.who} starts with ${a} ${item} and gives ${b} to ${f}. How many ${item} are left?`,
    (c, f, a, b, item) => `There are ${a} ${item} on the table. ${b} roll away. How many ${item} are still there?`,
    (c, f, a, b, item) => `${c} finds ${a} ${item}, but ${b} are lost on the way home. How many ${item} make it home?`,
  ];

  const nextAddTemplate = makeQueue(addTemplates, rng);
  const nextSubTemplate = makeQueue(subTemplates, rng);
  const nextCharacter = makeQueue(theme.characters, rng);
  const nextItem = makeQueue(theme.items, rng);
  const startWithAdd = rng.chance(0.5);
  const used = new Set();

  for (let i = 0; i < total; i += 1) {
    const kind = (i % 2 === 0) === startWithAdd ? 'add' : 'sub';
    const character = nextCharacter();
    const friends = theme.characters.filter((name) => name !== character);
    const friend = friends.length ? rng.pick(friends) : 'A friend';
    const item = nextItem();
    let a;
    let b;
    let answer;
    let key = '';
    let attempts = 0;

    do {
      if (kind === 'add') {
        a = rng.int(2, 12);
        b = rng.int(2, Math.max(2, Math.min(8, 20 - a)));
        answer = a + b;
      } else {
        a = rng.int(7, 20);
        b = rng.int(2, a - 3);
        answer = a - b;
      }
      key = `${kind}:${a}:${b}`;
      attempts += 1;
    } while (used.has(key) && attempts < 40);

    used.add(key);
    const template = kind === 'add' ? nextAddTemplate() : nextSubTemplate();
    const emoji = kind === 'add' ? theme.emoji : theme.deco[i % theme.deco.length];
    problems.push({ text: template(character, friend, a, b, item), answer, emoji });
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Story problems', `${problems.length} stories`)}
      <ol class="word-list">
        ${problems.map((problem, index) => `<li class="word-problem">
          <span class="word-problem__num">${index + 1}</span>
          <div class="word-problem__body">
            <p class="word-problem__text"><span class="word-problem__emoji" aria-hidden="true">${problem.emoji}</span><span>${escapeHtml(problem.text)}</span></p>
            <span class="word-problem__answer"><span>Answer</span><i></i></span>
          </div>
        </li>`).join('')}
      </ol>
      <div class="word-workbox">
        <div class="word-workbox__head"><span aria-hidden="true">✏️</span><span>Show your thinking — draw a picture for one of the stories</span></div>
        <div class="word-workbox__area" aria-hidden="true"></div>
      </div>
    </section>`,
    answers: problems.map((problem) => String(problem.answer)),
    answersNote: 'Answers are listed in story order.',
    count: problems.length,
  };
}

function buildMixedPreKContent(count, theme, rng, options = {}) {
  const range = Array.isArray(options.range) ? options.range : [1, 5];
  const traceNumbers = [];
  for (let number = range[0]; number <= range[1] && traceNumbers.length < 3; number += 1) {
    traceNumbers.push(number);
  }
  const itemCount = Math.min(count, 4);
  const items = makeCountItems(itemCount, theme, rng);
  const body = [
    traceBlock(traceNumbers, theme, { compact: true, letter: 'A' }),
    countBlock(items, {
      roomy: itemCount <= 10,
      dense: itemCount > 10,
      letter: 'B',
      title: 'Count & write',
    }),
  ].join('');

  return {
    body,
    answers: items.map((item) => String(item.count)),
    answersNote: 'Answer key covers the counting section. Tracing needs no key.',
    count: items.length + traceNumbers.length,
  };
}

function sheetCount(count, max) {
  return Math.max(1, Math.min(Number.isFinite(count) ? count : 10, max));
}

function answerBox(extraClass = '') {
  return `<span class="answer-box${extraClass ? ' ' + extraClass : ''}" aria-hidden="true"></span>`;
}

function buildPatternsContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const symbols = [theme.emoji, ...theme.deco];
  const rows = [];
  for (let i = 0; i < total; i += 1) {
    const unitLength = rng.int(2, 3);
    const unit = rng.shuffle(symbols).slice(0, unitLength);
    const length = rng.int(7, 9);
    const blanks = rng.int(1, 2);
    const sequence = Array.from({ length }, (_, index) => unit[index % unit.length]);
    rows.push({ visible: sequence.slice(0, length - blanks), blanks: sequence.slice(length - blanks) });
  }
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Continue the pattern', `${total} patterns`)}
    <div class="pattern-list">
      ${rows.map((row, index) => `<div class="pattern-row">
        <span class="pattern-row__num">${index + 1}</span>
        <span class="pattern-row__seq">${row.visible.map((symbol) => `<span class="pattern-symbol">${symbol}</span>`).join('')}${row.blanks.map(() => '<span class="pattern-blank"></span>').join('')}</span>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: rows.map((row) => row.blanks.join(' ')), answersNote: 'The answer shows the pictures that finish each pattern.', count: total };
}

function buildSortContent(count, theme, rng) {
  const kinds = [
    { kind: 'circle', label: 'Circles' },
    { kind: 'square', label: 'Squares' },
    { kind: 'triangle', label: 'Triangles' },
    { kind: 'star', label: 'Stars' },
  ];
  const counts = kinds.map(() => rng.int(1, 4));
  const pile = [];
  kinds.forEach((item, index) => { for (let i = 0; i < counts[index]; i += 1) pile.push(item.kind); });
  const shuffled = rng.shuffle(pile);
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Sort & count', 'Count each shape')}
    <div class="sort-pile" aria-hidden="true">${shuffled.map((kind) => shapeSvg(kind, rng.int(0, 3))).join('')}</div>
    <div class="sort-tally">
      ${kinds.map((item, index) => `<div class="sort-tally__item">
        ${shapeSvg(item.kind, index)}
        <span class="sort-tally__label">${item.label}</span>
        ${answerBox()}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: counts.map(String), answersNote: 'Answers are the number of circles, squares, triangles and stars.', count: 4 };
}

function tenFrameMarkup(value) {
  return `<div class="ten-frame" aria-hidden="true">${Array.from({ length: 10 }, (_, index) => `<span class="${index < value ? 'is-filled' : ''}"></span>`).join('')}</div>`;
}

function buildTenframeContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const values = Array.from({ length: total }, () => rng.int(3, 10));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Ten-frame count', `${total} frames`)}
    <div class="tenframe-grid ${total > 8 ? 'tenframe-grid--dense' : ''}">
      ${values.map((value) => `<div class="tenframe-card">${tenFrameMarkup(value)}${answerBox()}</div>`).join('')}
    </div>
  </section>`;
  return { body, answers: values.map(String), answersNote: 'Answers are the number of dots in each ten-frame.', count: total };
}

const DICE_PIPS = {
  1: [[30, 30]],
  2: [[18, 18], [42, 42]],
  3: [[18, 18], [30, 30], [42, 42]],
  4: [[18, 18], [18, 42], [42, 18], [42, 42]],
  5: [[18, 18], [18, 42], [30, 30], [42, 18], [42, 42]],
  6: [[18, 18], [18, 30], [18, 42], [42, 18], [42, 30], [42, 42]],
};

function diceSvg(value) {
  return `<svg class="die" viewBox="0 0 60 60" aria-hidden="true"><rect x="2" y="2" width="56" height="56" rx="12" fill="#fff" stroke="currentColor" stroke-width="2.5"/>${DICE_PIPS[value].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/>`).join('')}</svg>`;
}

function buildDiceContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const rolls = Array.from({ length: total }, () => ({ a: rng.int(1, 6), b: rng.int(1, 6) }));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Dice addition', `${total} cards`)}
    <div class="dice-grid ${total > 8 ? 'dice-grid--dense' : ''}">
      ${rolls.map((roll, index) => `<div class="dice-card">
        <span class="dice-card__num">${index + 1}</span>
        <span class="dice-pair" aria-hidden="true">${diceSvg(roll.a)}<b>+</b>${diceSvg(roll.b)}</span>
        ${answerBox()}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: rolls.map((roll) => String(roll.a + roll.b)), answersNote: 'Answers are the sums of the two dice.', count: total };
}

function buildAddPicsContent(count, theme, rng) {
  const total = count;
  const problems = Array.from({ length: total }, () => {
    const a = rng.int(1, 5);
    const b = rng.int(1, 5);
    const icon = rng.chance(0.7) ? theme.emoji : rng.pick(theme.deco);
    return { a, b, icon, answer: a + b };
  });
  const dense = total > 10;
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Picture addition', `${total} problems`)}
    <div class="picture-eq-grid ${dense ? 'picture-eq-grid--dense' : ''}">
      ${problems.map((problem) => `<div class="picture-eq">
        <span class="picture-eq__group" aria-hidden="true">${problem.icon.repeat(problem.a)}</span>
        <b>+</b>
        <span class="picture-eq__group" aria-hidden="true">${problem.icon.repeat(problem.b)}</span>
        <b>=</b>
        ${answerBox()}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: problems.map((problem) => String(problem.answer)), answersNote: 'Answers are listed in worksheet order.', count: total };
}

function buildSubPicsContent(count, theme, rng) {
  const total = count;
  const problems = Array.from({ length: total }, () => {
    const a = rng.int(4, 9);
    const b = rng.int(1, a - 1);
    const icon = rng.chance(0.7) ? theme.emoji : rng.pick(theme.deco);
    return { a, b, icon, answer: a - b };
  });
  const dense = total > 10;
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Cross-out subtraction', `${total} problems`)}
    <div class="picture-eq-grid ${dense ? 'picture-eq-grid--dense' : ''}">
      ${problems.map((problem) => {
        const marks = Array.from({ length: problem.a }, (_, index) => `<span class="${index < problem.b ? 'is-crossed' : ''}">${problem.icon}</span>`).join('');
        return `<div class="picture-eq">
          <span class="picture-eq__group picture-eq__group--cross" aria-hidden="true">${marks}</span>
          <b>−</b>
          <span>${problem.b}</span>
          <b>=</b>
          ${answerBox()}
        </div>`;
      }).join('')}
    </div>
  </section>`;
  return { body, answers: problems.map((problem) => String(problem.answer)), answersNote: 'Answers are listed in worksheet order.', count: total };
}

function buildDoublesContent(count, theme, rng) {
  const total = count;
  const problems = Array.from({ length: total }, () => {
    const a = rng.int(1, 10);
    return { a, b: a, op: '+', result: a + a, answer: a + a, missing: null };
  });
  const dense = total > 10;
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Doubles', `${total} problems`)}
    <ol class="problem-grid ${dense ? 'problem-grid--dense' : ''}">
      ${problems.map((problem, index) => equationMarkup(problem, index)).join('')}
    </ol>
  </section>`;
  return { body, answers: problems.map((problem) => String(problem.answer)), answersNote: 'Answers are listed in worksheet order.', count: total };
}

function buildBeforeAfterContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const values = Array.from({ length: total }, () => rng.int(2, 19));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'One more, one less', `${total} cards`)}
    <div class="beforeafter-grid ${total > 8 ? 'beforeafter-grid--dense' : ''}">
      ${values.map((n) => `<div class="beforeafter-card">
        <div class="beforeafter-cell"><span class="beforeafter-label">Before</span>${answerBox()}</div>
        <span class="beforeafter-num">${n}</span>
        <div class="beforeafter-cell"><span class="beforeafter-label">After</span>${answerBox()}</div>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: values.map((n) => `${n - 1}, ${n + 1}`), answersNote: 'Answers are the numbers before and after.', count: total };
}

function buildSkipCountContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const sequences = [];
  for (let i = 0; i < total; i += 1) {
    const step = rng.pick([2, 5, 10]);
    const start = step;
    const length = 8;
    const terms = Array.from({ length }, (_, k) => start + k * step);
    const blanks = new Set();
    while (blanks.size < 2) blanks.add(rng.int(2, length - 1));
    sequences.push({ terms, blanks: [...blanks].sort((a, b) => a - b), step });
  }
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Skip counting', `${total} sequences`)}
    <div class="sequence-list">
      ${sequences.map((sequence, index) => `<div class="sequence-row">
        <span class="sequence-row__num">${index + 1}</span>
        <span class="sequence-row__step">Count by ${sequence.step}s</span>
        <span class="sequence-row__terms">${sequence.terms.map((term, termIndex) => sequence.blanks.includes(termIndex) ? '<span class="sequence-blank"></span>' : `<span class="sequence-term">${term}</span>`).join('')}</span>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: sequences.map((sequence) => sequence.blanks.map((blank) => sequence.terms[blank]).join(', ')), answersNote: 'Answers are the missing numbers in each sequence.', count: total };
}

function buildGreaterContent(count, theme, rng) {
  const total = count;
  const pairs = Array.from({ length: total }, () => {
    const a = rng.int(1, 20);
    let b = rng.int(1, 20);
    if (rng.chance(0.15)) b = a;
    const answer = a > b ? '>' : a < b ? '<' : '=';
    return { a, b, answer };
  });
  const dense = total > 10;
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Compare the numbers', `${total} pairs`)}
    <div class="greater-grid ${dense ? 'greater-grid--dense' : ''}">
      ${pairs.map((pair) => `<div class="greater-card">
        <span>${pair.a}</span>
        <span class="symbol-box"></span>
        <span>${pair.b}</span>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: pairs.map((pair) => pair.answer), answersNote: 'Answers are >, < or =.', count: total };
}

function buildPlaceContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const items = Array.from({ length: total }, () => {
    const tens = rng.int(1, 5);
    const ones = rng.int(0, 9);
    return { tens, ones };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Tens & ones', `${total} numbers`)}
    <div class="place-grid ${total > 8 ? 'place-grid--dense' : ''}">
      ${items.map((item) => `<div class="place-card">
        <div class="place-blocks" aria-hidden="true">
          <div class="base-ten">
            <div class="base-ten__tens">${Array.from({ length: item.tens }, () => '<span class="base-ten__rod"></span>').join('')}</div>
            <div class="base-ten__ones">${Array.from({ length: item.ones }, () => '<span class="base-ten__unit"></span>').join('')}</div>
          </div>
        </div>
        <div class="place-answer-row">
          <span class="place-label">Tens</span>${answerBox()}
          <span class="place-label">Ones</span>${answerBox()}
        </div>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: items.map((item) => `${item.tens} tens, ${item.ones} ones`), answersNote: 'Answers are the tens and ones.', count: total };
}

function buildOrdinalContent(count, theme, rng) {
  const total = sheetCount(count, 10);
  const rows = [];
  for (let i = 0; i < total; i += 1) {
    const position = rng.int(1, 5);
    const target = theme.deco[2];
    const filler = theme.emoji;
    const items = Array.from({ length: 5 }, (_, index) => (index + 1 === position ? target : filler));
    rows.push({ items, position, target });
  }
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Ordinal numbers', `${total} rows`)}
    <div class="ordinal-grid ${total > 6 ? 'ordinal-grid--dense' : ''}">
      ${rows.map((row) => `<div class="ordinal-card">
        <div class="ordinal-row" aria-hidden="true">${row.items.map((symbol) => `<span class="ordinal-item">${symbol}</span>`).join('')}</div>
        <p class="ordinal-question">What position is the ${row.target}? ${answerBox()}</p>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: rows.map((row) => String(row.position)), answersNote: 'Answers are the positions.', count: total };
}

function numberLineSvg(start, hops, max) {
  const width = 560;
  const left = 30;
  const right = 30;
  const y = 54;
  const span = width - left - right;
  const x = (n) => left + (n / max) * span;
  const ticks = Array.from({ length: max + 1 }, (_, n) => {
    const tx = x(n);
    const tall = n % 5 === 0;
    return `<line x1="${tx}" y1="${y - (tall ? 10 : 5)}" x2="${tx}" y2="${y + (tall ? 10 : 5)}" stroke="currentColor" stroke-width="${tall ? 2 : 1}"/><text x="${tx}" y="${y + 30}" text-anchor="middle" font-size="10" font-weight="${tall ? 700 : 500}">${tall ? n : ''}</text>`;
  }).join('');
  const sx = x(start);
  const ex = x(Math.min(max, start + hops));
  const arc = `<path d="M ${sx} ${y - 6} Q ${(sx + ex) / 2} ${y - 45} ${ex} ${y - 6}" fill="none" stroke="var(--ws-accent)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="5 4"/><circle cx="${sx}" cy="${y}" r="5" fill="var(--ws-accent)"/><circle cx="${ex}" cy="${y}" r="5" fill="#fff" stroke="var(--ws-accent)" stroke-width="2.5"/>`;
  return `<svg class="numberline-svg" viewBox="0 0 ${width} 100" aria-hidden="true"><line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="currentColor" stroke-width="2"/>${ticks}${arc}</svg>`;
}

function buildNumberLineContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const items = Array.from({ length: total }, () => ({ start: rng.int(1, 10), hops: rng.int(1, 5) }));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Number line hops', `${total} hops`)}
    <div class="numberline-list">
      ${items.map((item, index) => `<div class="numberline-card">
        <span class="numberline-card__num">${index + 1}</span>
        ${numberLineSvg(item.start, item.hops, 20)}
        <p class="numberline-question">Start at ${item.start}. Hop ${item.hops} forward. Where do you land? ${answerBox()}</p>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: items.map((item) => String(item.start + item.hops)), answersNote: 'Answers are the landing numbers.', count: total };
}

function buildNumberWordsContent(count, theme, rng) {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  const total = sheetCount(count, 12);
  const values = [];
  while (values.length < total) {
    const n = rng.int(1, 20);
    if (!values.includes(n)) values.push(n);
  }
  const bank = rng.shuffle(values.map((n) => words[n])).join(' · ');
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Number words', `${total} numbers`)}
    <div class="word-bank"><strong>Word bank:</strong> ${bank}</div>
    <div class="numberword-grid ${total > 8 ? 'numberword-grid--dense' : ''}">
      ${values.map((n) => `<div class="numberword-card">
        <span class="numberword-num">${n}</span>
        ${answerBox('answer-box--wide')}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: values.map((n) => words[n]), answersNote: 'Answers are the number words.', count: total };
}

function buildPlace100Content(count, theme, rng) {
  const total = sheetCount(count, 12);
  const numbers = Array.from({ length: total }, () => rng.int(11, 99));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Place value to 100', `${total} numbers`)}
    <div class="place100-grid ${total > 8 ? 'place100-grid--dense' : ''}">
      ${numbers.map((n) => {
        const tens = Math.floor(n / 10);
        const ones = n % 10;
        return `<div class="place100-card">
          <span class="place100-num">${n}</span>
          <span class="place100-eq">${n} = ${answerBox()} + ${answerBox()}</span>
        </div>`;
      }).join('')}
    </div>
  </section>`;
  return { body, answers: numbers.map((n) => `${Math.floor(n / 10) * 10} + ${n % 10}`), answersNote: 'Answers are tens + ones.', count: total };
}

function buildEvenOddContent(count, theme, rng) {
  const total = sheetCount(count, 15);
  const values = Array.from({ length: total }, () => rng.int(1, 50));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Even or odd?', `${total} numbers`)}
    <div class="evenodd-grid ${total > 10 ? 'evenodd-grid--dense' : ''}">
      ${values.map((n) => `<div class="evenodd-card">
        <span class="evenodd-num">${n}</span>
        <span class="evenodd-choice">Even ${answerBox('answer-box--small')} Odd ${answerBox('answer-box--small')}</span>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: values.map((n) => (n % 2 === 0 ? 'Even' : 'Odd')), answersNote: 'Answers are even or odd.', count: total };
}

function fractionVisual(parts, shaded, shape) {
  if (shape === 'circle') {
    const angle = (shaded / parts) * 360;
    return `<span class="fraction-circle" style="background:conic-gradient(var(--ws-accent) 0 ${angle}deg, #fff ${angle}deg 360deg);" aria-hidden="true"></span>`;
  }
  return `<span class="fraction-rect" aria-hidden="true">${Array.from({ length: parts }, (_, i) => `<span class="${i < shaded ? 'is-shaded' : ''}"></span>`).join('')}</span>`;
}

function buildFractionsContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const items = Array.from({ length: total }, () => {
    const parts = rng.pick([2, 4]);
    const shaded = rng.int(1, parts - 1);
    const shape = rng.chance(0.5) ? 'circle' : 'rect';
    return { parts, shaded, shape };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Fractions', `${total} shapes`)}
    <div class="fraction-grid ${total > 8 ? 'fraction-grid--dense' : ''}">
      ${items.map((item) => `<div class="fraction-card">
        ${fractionVisual(item.parts, item.shaded, item.shape)}
        ${answerBox()}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: items.map((item) => `${item.shaded}/${item.parts}`), answersNote: 'Answers are the shaded fractions.', count: total };
}

function clockSvg(hour, minute) {
  const cx = 50;
  const cy = 50;
  const hand = (angle, length) => {
    const x = cx + Math.sin(angle) * length;
    const y = cy - Math.cos(angle) * length;
    return { x, y };
  };
  const hourAngle = (((hour % 12) + minute / 60) * 30) * Math.PI / 180;
  const minuteAngle = (minute / 60) * 360 * Math.PI / 180;
  const h = hand(hourAngle, 24);
  const m = hand(minuteAngle, 34);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30 * Math.PI / 180;
    const x1 = cx + Math.sin(a) * 40;
    const y1 = cy - Math.cos(a) * 40;
    const x2 = cx + Math.sin(a) * 46;
    const y2 = cy - Math.cos(a) * 46;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="2"/>`;
  }).join('');
  const labels = `<text x="50" y="16" text-anchor="middle" font-size="9" font-weight="700">12</text><text x="86" y="54" text-anchor="middle" font-size="9" font-weight="700">3</text><text x="50" y="92" text-anchor="middle" font-size="9" font-weight="700">6</text><text x="14" y="54" text-anchor="middle" font-size="9" font-weight="700">9</text>`;
  return `<svg class="clock-svg" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff" stroke="currentColor" stroke-width="2.5"/>${ticks}${labels}<line x1="50" y1="50" x2="${h.x}" y2="${h.y}" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="50" y1="50" x2="${m.x}" y2="${m.y}" stroke="var(--ws-accent)" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="50" r="2.5" fill="currentColor"/></svg>`;
}

function buildTimeContent(count, theme, rng) {
  const total = sheetCount(count, 10);
  const items = Array.from({ length: total }, () => ({ hour: rng.int(1, 12), minute: rng.pick([0, 30]) }));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Telling time', `${total} clocks`)}
    <div class="clock-grid ${total > 6 ? 'clock-grid--dense' : ''}">
      ${items.map((item) => `<div class="clock-card">
        ${clockSvg(item.hour, item.minute)}
        ${answerBox('answer-box--wide')}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: items.map((item) => `${item.hour}:${item.minute === 0 ? '00' : '30'}`), answersNote: 'Answers are the times shown.', count: total };
}

function buildMoneyContent(count, theme, rng) {
  const coinValues = [1, 5, 10, 25];
  const total = sheetCount(count, 10);
  const purses = Array.from({ length: total }, () => {
    const coins = Array.from({ length: rng.int(3, 5) }, () => rng.pick(coinValues));
    return { coins, total: coins.reduce((a, b) => a + b, 0) };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Count the coins', `${total} purses`)}
    <div class="money-grid ${total > 6 ? 'money-grid--dense' : ''}">
      ${purses.map((purse) => `<div class="money-card">
        <div class="coin-row" aria-hidden="true">${purse.coins.map((value) => `<span class="coin coin--${value}">${value}¢</span>`).join('')}</div>
        ${answerBox('answer-box--wide')}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: purses.map((purse) => `${purse.total}¢`), answersNote: 'Answers are the total value of the coins.', count: total };
}

function buildFactFamilyContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const families = Array.from({ length: total }, () => {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    return { a, b, sum: a + b };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Fact families', `${total} families`)}
    <div class="factfamily-grid ${total > 4 ? 'factfamily-grid--dense' : ''}">
      ${families.map((family) => `<div class="factfamily-card">
        <div class="factfamily-triangle" aria-hidden="true">
          <span class="factfamily-top">${family.sum}</span>
          <span class="factfamily-left">${family.a}</span>
          <span class="factfamily-right">${family.b}</span>
        </div>
        <div class="factfamily-lines">
          ${Array.from({ length: 4 }, () => '<span class="factfamily-line"></span>').join('')}
        </div>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: families.map((family) => `${family.a} + ${family.b} = ${family.sum}; ${family.b} + ${family.a} = ${family.sum}; ${family.sum} - ${family.a} = ${family.b}; ${family.sum} - ${family.b} = ${family.a}`), answersNote: 'Answers are the four related facts.', count: total };
}

function buildThreeAddContent(count, theme, rng) {
  const total = count;
  const problems = Array.from({ length: total }, () => {
    const a = rng.int(1, 6);
    const b = rng.int(1, 6);
    const c = rng.int(1, 6);
    return { a, b, c, answer: a + b + c };
  });
  const dense = total > 10;
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Add three numbers', `${total} problems`)}
    <ol class="problem-grid ${dense ? 'problem-grid--dense' : ''}">
      ${problems.map((problem, index) => `<li class="problem">
        <span class="problem__num">${index + 1}</span>
        <span class="equation"><span>${problem.a}</span><b class="op">+</b><span>${problem.b}</span><b class="op">+</b><span>${problem.c}</span><b class="op">=</b><i class="eq-blank" aria-hidden="true"></i></span>
      </li>`).join('')}
    </ol>
  </section>`;
  return { body, answers: problems.map((problem) => String(problem.answer)), answersNote: 'Answers are listed in worksheet order.', count: total };
}

function buildTwoDigitContent(count, theme, rng) {
  const total = count;
  const problems = [];
  for (let i = 0; i < total; i += 1) {
    if (rng.chance(0.5)) {
      const tensA = rng.int(1, 8);
      const onesA = rng.int(1, 8);
      const tensB = rng.int(1, 9 - tensA);
      const onesB = rng.int(1, 9 - onesA);
      const a = tensA * 10 + onesA;
      const b = tensB * 10 + onesB;
      problems.push({ a, b, op: '+', answer: a + b });
    } else {
      const tensA = rng.int(2, 9);
      const onesA = rng.int(1, 9);
      const tensB = rng.int(1, tensA - 1);
      const onesB = rng.int(1, onesA);
      const a = tensA * 10 + onesA;
      const b = tensB * 10 + onesB;
      problems.push({ a, b, op: '−', answer: a - b });
    }
  }
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Two-digit practice', `${total} problems`)}
    <div class="vertical-grid ${total > 10 ? 'vertical-grid--dense' : ''}">
      ${problems.map((problem) => `<div class="vertical-problem">
        <span class="vertical-op">${problem.op}</span>
        <span class="vertical-num">${problem.a}</span>
        <span class="vertical-num">${problem.b}</span>
        <span class="vertical-rule"></span>
        <span class="vertical-answer"></span>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: problems.map((problem) => String(problem.answer)), answersNote: 'Answers are listed in worksheet order.', count: total };
}

function buildArraysContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const items = Array.from({ length: total }, () => {
    const rows = rng.int(2, 5);
    const cols = rng.int(2, 5);
    return { rows, cols, answer: rows * cols };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Arrays', `${total} arrays`)}
    <div class="array-grid ${total > 4 ? 'array-grid--dense' : ''}">
      ${items.map((item) => `<div class="array-card">
        <div class="array-dots" style="--array-cols:${item.cols}" aria-hidden="true">${Array.from({ length: item.rows * item.cols }, () => '<span></span>').join('')}</div>
        <p class="array-equation">${item.cols} + ${item.cols}${item.rows > 2 ? ' + …' : ''} = ${answerBox()} <span class="array-total">(${item.rows} × ${item.cols})</span></p>
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: items.map((item) => String(item.answer)), answersNote: 'Answers are the total number of dots.', count: total };
}

function buildGraphContent(count, theme, rng, options = {}) {
  // Kindergarten standards: one graph with 3–4 questions is a full task.
  const total = sheetCount(count, options.difficulty === 'k' ? 1 : 2);
  const graphs = Array.from({ length: total }, () => {
    const categories = [theme.emoji, ...theme.deco.slice(0, 3)];
    const counts = categories.map(() => rng.int(1, 6));
    const totalAll = counts.reduce((a, b) => a + b, 0);
    const maxIndex = counts.indexOf(Math.max(...counts));
    const minIndex = counts.indexOf(Math.min(...counts));
    return { categories, counts, totalAll, maxIndex, minIndex };
  });
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Picture graphs', `${graphs.length} graphs`)}
    ${graphs.map((graph, graphIndex) => `<div class="graph-card">
      <div class="graph-title">Graph ${graphIndex + 1}</div>
      <div class="graph-rows">
        ${graph.categories.map((symbol, index) => `<div class="graph-row">
          <span class="graph-label" aria-hidden="true">${symbol}</span>
          <span class="graph-pictures" aria-hidden="true">${symbol.repeat(graph.counts[index])}</span>
        </div>`).join('')}
      </div>
      <div class="graph-questions">
        <div class="graph-question">Which has the most? ${answerBox('answer-box--wide')}</div>
        <div class="graph-question">Which has the least? ${answerBox('answer-box--wide')}</div>
        <div class="graph-question">How many in all? ${answerBox('answer-box--wide')}</div>
      </div>
    </div>`).join('')}
  </section>`;
  return { body, answers: graphs.flatMap((graph) => [graph.categories[graph.maxIndex], graph.categories[graph.minIndex], String(graph.totalAll)]), answersNote: 'Answers are most, least, and total.', count: graphs.length * 3 };
}

function buildRoundingContent(count, theme, rng) {
  const total = sheetCount(count, 15);
  const values = Array.from({ length: total }, () => rng.int(11, 89));
  const body = `<section class="ws-block">
    ${blockTitle('A', 'Round to the nearest ten', `${total} numbers`)}
    <div class="round-grid ${total > 10 ? 'round-grid--dense' : ''}">
      ${values.map((n) => `<div class="round-card">
        <span class="round-num">${n}</span>
        ${answerBox()}
      </div>`).join('')}
    </div>
  </section>`;
  return { body, answers: values.map((n) => String(Math.round(n / 10) * 10)), answersNote: 'Answers are the rounded numbers.', count: total };
}

const SOLID_SVGS = {
  cube: '<svg class="solid-svg" viewBox="0 0 80 80" aria-hidden="true"><path d="M20 28 40 16l20 12v24L40 64 20 52z" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/><path d="M20 28 40 40l20-12M40 40v24" stroke="currentColor" stroke-width="2.5" fill="none"/></svg>',
  sphere: '<svg class="solid-svg" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="28" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/><ellipse cx="40" cy="40" rx="28" ry="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/></svg>',
  cylinder: '<svg class="solid-svg" viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="20" rx="22" ry="8" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/><rect x="18" y="20" width="44" height="40" fill="#eaf0ff" stroke="none"/><line x1="18" y1="20" x2="18" y2="60" stroke="currentColor" stroke-width="2.5"/><line x1="62" y1="20" x2="62" y2="60" stroke="currentColor" stroke-width="2.5"/><ellipse cx="40" cy="60" rx="22" ry="8" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/></svg>',
  cone: '<svg class="solid-svg" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 12 18 62h44z" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/><ellipse cx="40" cy="62" rx="22" ry="8" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/></svg>',
  pyramid: '<svg class="solid-svg" viewBox="0 0 80 80" aria-hidden="true"><path d="M40 14 14 62h52z" fill="#eaf0ff" stroke="currentColor" stroke-width="2.5"/><path d="M40 14 40 62" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/></svg>',
};

function buildShapes3DContent(count, theme, rng) {
  const kinds = Object.keys(SOLID_SVGS);
  const total = sheetCount(count, 10);
  const items = Array.from({ length: total }, () => rng.pick(kinds));
  const body = `<section class="ws-block">
    ${blockTitle('A', '3D shapes', `${total} shapes`)}
    <div class="solid-grid ${total > 6 ? 'solid-grid--dense' : ''}">
      ${items.map((kind) => `<div class="solid-card">
        ${SOLID_SVGS[kind]}
        ${answerBox('answer-box--wide')}
      </div>`).join('')}
    </div>
    <p class="word-bank"><strong>Word bank:</strong> cube, sphere, cylinder, cone, pyramid</p>
  </section>`;
  return { body, answers: items, answersNote: 'Answers are the shape names.', count: total };
}

/* =========================================================
   Age-band activity generators (2026 rebuild)
   Pre-K activities are deliberately low-count and large-format;
   Kindergarten keeps picture support; Grade 1 fades to symbols.
   ========================================================= */

const PREWRITE_PATHS = [
  'M 28 66 Q 76 14 124 66 T 220 66 T 316 66 T 412 66 T 508 66 T 604 66',
  'M 28 76 L 88 28 L 148 76 L 208 28 L 268 76 L 328 28 L 388 76 L 448 28 L 508 76 L 568 28 L 616 44',
  'M 28 76 Q 54 22 80 76 Q 106 22 132 76 Q 158 22 184 76 Q 210 22 236 76 Q 262 22 288 76 Q 314 22 340 76 Q 366 22 392 76 Q 418 22 444 76 Q 470 22 496 76 Q 522 22 548 76 Q 574 22 600 76',
  'M 28 78 L 84 78 L 84 46 L 140 46 L 140 78 L 196 78 L 196 46 L 252 46 L 252 78 L 308 78 L 308 46 L 364 46 L 364 78 L 420 78 L 420 46 L 476 46 L 476 78 L 532 78 L 532 46 L 588 46 L 616 46',
  'M 28 80 L 96 32 L 164 80 L 232 32 L 300 80 L 368 32 L 436 80 L 504 32 L 572 80 L 616 56',
];

function prewriteLoopPath() {
  let d = '';
  for (let i = 0; i < 6; i += 1) {
    const cx = 60 + i * 96;
    d += `M ${cx - 28} 62 C ${cx - 28} 18 ${cx + 28} 18 ${cx + 28} 62 C ${cx + 28} 104 ${cx - 28} 104 ${cx - 28} 62 `;
  }
  return d.trim();
}

function buildPrewriteContent(count, theme, rng) {
  const total = sheetCount(count, 5);
  const paths = rng.shuffle([...PREWRITE_PATHS, prewriteLoopPath()]).slice(0, total);
  const rows = paths.map((d, index) => `<div class="prewrite-row">
    <span class="prewrite-row__label">${index + 1}</span>
    <div class="prewrite-row__track">
      <svg class="prewrite-svg" viewBox="0 0 640 120" preserveAspectRatio="none" aria-hidden="true">
        <path class="prewrite-guide" d="${d}"/>
        <path class="prewrite-path" d="${d}"/>
        <circle class="prewrite-dot" cx="28" cy="66" r="7"/>
      </svg>
    </div>
    <span class="prewrite-row__ends" aria-hidden="true">${theme.emoji}<span>${theme.deco[0]}</span></span>
  </div>`).join('');

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Trace the paths', `${total} paths`)}
      <div class="prewrite-list">${rows}</div>
    </section>`,
    answers: [],
    answersNote: 'No answer key for tracing. Sit beside your child and talk about the path direction.',
    count: total,
  };
}

const COLOUR_TOKENS = [
  { name: 'red', hex: '#e05555' },
  { name: 'blue', hex: '#3c8fd0' },
  { name: 'yellow', hex: '#e8b52a' },
  { name: 'green', hex: '#4f9e4f' },
  { name: 'pink', hex: '#e86fa8' },
  { name: 'purple', hex: '#8a6bd6' },
];

function buildColorsContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const cards = [];
  for (let i = 0; i < total; i += 1) {
    const pair = rng.shuffle(COLOUR_TOKENS).slice(0, 2);
    const target = pair[0];
    const other = pair[1];
    const targetCount = rng.int(2, 4);
    const otherCount = rng.int(1, 3);
    const shapes = rng.shuffle([
      ...Array.from({ length: targetCount }, () => target),
      ...Array.from({ length: otherCount }, () => other),
    ]);
    cards.push({ target, shapes });
  }

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Colour hunt', `${total} cards`)}
      <div class="colour-grid">
        ${cards.map((card) => `<div class="colour-card">
          <div class="colour-card__shapes" aria-hidden="true">
            ${card.shapes.map((colour) => `<span class="colour-shape" style="--dot:${colour.hex}"></span>`).join('')}
          </div>
          <div class="colour-card__footer">
            <span class="colour-swatch" style="--dot:${card.target.hex}"></span>
            <span class="colour-label">${card.target.name}</span>
            ${answerBox('answer-box--tall')}
          </div>
        </div>`).join('')}
      </div>
    </section>`,
    answers: cards.map((card) => String(card.shapes.filter((colour) => colour.name === card.target.name).length)),
    answersNote: 'Answers are the number of shapes in the target colour on each card.',
    count: total,
  };
}

function buildSameDiffContent(count, theme, rng) {
  const total = sheetCount(count, 4);
  const rows = Array.from({ length: total }, () => {
    const same = rng.chance(0.5) ? theme.emoji : theme.deco[0];
    const odd = theme.deco[1];
    const items = rng.shuffle([same, same, same, odd]);
    return { items };
  });
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Same & different', `${total} rows`)}
      <div class="samediff-list">
        ${rows.map((row, index) => `<div class="samediff-row">
          <span class="samediff-row__num">${index + 1}</span>
          <span class="samediff-row__items" aria-hidden="true">${row.items.map((item) => `<span class="samediff-item">${item}</span>`).join('')}</span>
          <span class="samediff-row__hint">Circle the odd one</span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: [],
    answersNote: 'Ask your child to say why the circled picture is different.',
    count: total,
  };
}

const POSITION_WORDS = [
  { key: 'above', text: 'above', anchor: 'the picture' },
  { key: 'below', text: 'below', anchor: 'the picture' },
  { key: 'beside', text: 'beside', anchor: 'the picture' },
  { key: 'front', text: 'in front of', anchor: 'the picture' },
  { key: 'behind', text: 'behind', anchor: 'the picture' },
  { key: 'inside', text: 'inside', anchor: 'the box' },
];

function buildPositionContent(count, theme, rng) {
  const total = sheetCount(count, 4);
  const words = rng.shuffle(POSITION_WORDS).slice(0, total);
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Where is it?', `${total} scenes`)}
      <div class="position-grid">
        ${words.map((word) => `<div class="position-card">
          <div class="position-scene position-scene--${word.key}" aria-hidden="true">
            <span class="position-anchor">${word.key === 'inside' ? '📦' : theme.deco[1]}</span>
            <span class="position-target">${theme.emoji}</span>
            <span class="position-other">${theme.deco[0]}</span>
          </div>
          <p class="position-question">Circle the one <strong>${word.text}</strong> ${word.anchor}.</p>
        </div>`).join('')}
      </div>
    </section>`,
    answers: [],
    answersNote: 'Position words are best practised out loud. Ask your child to show you above, below and beside with their hands.',
    count: total,
  };
}

function buildNumberHuntContent(count, theme, rng) {
  const total = sheetCount(count, 1);
  const hunts = Array.from({ length: total }, () => {
    const target = rng.int(1, 5);
    const size = 16;
    const values = [];
    const wanted = rng.int(3, 5);
    for (let i = 0; i < wanted; i += 1) values.push(target);
    while (values.length < size) {
      const n = rng.int(1, 5);
      if (n !== target || values.filter((v) => v === target).length < wanted) values.push(n);
    }
    return { target, values: rng.shuffle(values).slice(0, size), wanted };
  });

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Number hunt', `${total} hunts`)}
      <div class="hunt-grid">
        ${hunts.map((hunt) => `<div class="hunt-card">
          <div class="hunt-card__head">
            <span class="hunt-target">${hunt.target}</span>
            <span class="hunt-card__ask">Circle every <strong>${hunt.target}</strong></span>
            <span class="hunt-score">Found <i></i></span>
          </div>
          <div class="hunt-numbers" aria-hidden="true">
            ${hunt.values.map((value) => `<span class="hunt-num">${value}</span>`).join('')}
          </div>
        </div>`).join('')}
      </div>
    </section>`,
    answers: hunts.map((hunt) => String(hunt.wanted)),
    answersNote: 'Answers are the number of matching numerals in each hunt.',
    count: total,
  };
}

function buildDotsContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const cards = Array.from({ length: total }, () => rng.int(1, 5));
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Count & colour', `${total} cards`)}
      <div class="dot-grid">
        ${cards.map((value) => `<div class="dot-card">
          <span class="dot-card__num">${value}</span>
          <span class="dot-card__dots" aria-hidden="true">${Array.from({ length: 5 }, () => '<span class="dot"></span>').join('')}</span>
          <span class="dot-card__hint">Colour ${value}</span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: cards.map(String),
    answersNote: 'Answers are the numbers shown on each card.',
    count: total,
  };
}

function buildSortColorContent(count, theme, rng) {
  const total = sheetCount(count, 1);
  const kinds = [
    { symbol: theme.emoji, label: theme.name },
    { symbol: theme.deco[0], label: 'Other pictures' },
  ];
  const sorts = Array.from({ length: total }, () => {
    const pile = rng.shuffle([
      ...Array.from({ length: rng.int(4, 6) }, () => kinds[0]),
      ...Array.from({ length: rng.int(3, 5) }, () => kinds[1]),
    ]);
    return { pile };
  });

  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Sort into the bins', `${total} sorting mats`)}
      ${sorts.map((sort, index) => `<div class="sortbin-wrap">
        <div class="sortbin-pile" aria-hidden="true">${sort.pile.map((item) => `<span class="sortbin-item">${item.symbol}</span>`).join('')}</div>
        <div class="sortbin-row">
          ${kinds.map((kind) => `<div class="sortbin">
            <span class="sortbin__label">${kind.symbol} ${kind.label}</span>
            <span class="sortbin__area" aria-hidden="true"></span>
          </div>`).join('')}
        </div>
        <span class="sortbin-index">Mat ${index + 1}</span>
      </div>`).join('')}
    </section>`,
    answers: [],
    answersNote: 'No written answer key. Ask your child to explain how they sorted.',
    count: total,
  };
}

function buildMakeTenContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const values = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, total);
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Make ten', `${total} frames`)}
      <div class="maketen-grid ${total > 6 ? 'maketen-grid--dense' : ''}">
        ${values.map((value) => `<div class="maketen-card">
          ${tenFrameMarkup(value)}
          <p class="maketen-eq"><span>${value}</span><b>+</b>${answerBox('answer-box--tall')}<b>=</b><span>10</span></p>
          <span class="maketen-hint">How many empty spaces?</span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: values.map((value) => String(10 - value)),
    answersNote: 'Answers are the number needed to make ten.',
    count: total,
  };
}

function buildTeenContent(count, theme, rng) {
  const total = sheetCount(count, 8);
  const values = rng.shuffle([11, 12, 13, 14, 15, 16, 17, 18, 19]).slice(0, total);
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Teen numbers', `${total} numbers`)}
      <div class="teen-grid ${total > 6 ? 'teen-grid--dense' : ''}">
        ${values.map((value) => {
          const ones = value - 10;
          return `<div class="teen-card">
            <span class="teen-num">${value}</span>
            <div class="teen-frames" aria-hidden="true">
              ${tenFrameMarkup(10)}
              <div class="teen-extra">${Array.from({ length: ones }, () => '<span class="dot"></span>').join('')}</div>
            </div>
            <p class="teen-eq"><span>10</span><b>+</b>${answerBox('answer-box--small')}<b>=</b><span>${value}</span></p>
          </div>`;
        }).join('')}
      </div>
    </section>`,
    answers: values.map((value) => String(value - 10)),
    answersNote: 'Answers are the ones in each teen number.',
    count: total,
  };
}

function buildMeasureContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const kinds = ['longer', 'shorter', 'taller', 'longer'];
  const cards = Array.from({ length: total }, (_, index) => ({
    kind: kinds[index % kinds.length],
    a: rng.int(36, 88),
    b: rng.int(18, 44),
  }));
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Compare the size', `${total} pairs`)}
      <div class="measure-grid${total > 4 ? ' measure-grid--dense' : ''}">
        ${cards.map((card) => {
          const vertical = card.kind === 'taller';
          return `<div class="measure-card">
            <div class="measure-sticks${vertical ? ' measure-sticks--tall' : ''}" aria-hidden="true">
              <span class="measure-stick" style="--len:${card.a}%"></span>
              <span class="measure-stick" style="--len:${card.b}%"></span>
            </div>
            <p class="measure-question">Circle the <strong>${card.kind}</strong> one.</p>
          </div>`;
        }).join('')}
      </div>
    </section>`,
    answers: [],
    answersNote: 'For size words, ask your child to point and explain before circling.',
    count: total,
  };
}

const SYMMETRY_SHAPES = [
  { name: 'heart', d: 'M 50 86 C 22 64 12 42 28 30 C 40 21 48 30 50 40 Z' },
  { name: 'star', d: 'M 50 12 L 41 38 L 14 38 L 35 54 L 28 82 L 50 66 Z' },
  { name: 'house', d: 'M 50 88 L 50 46 L 22 46 L 50 18 Z' },
  { name: 'butterfly', d: 'M 50 52 C 36 24 14 28 20 46 C 12 54 26 64 40 58 C 42 72 50 74 50 62 Z' },
];

function buildSymmetryContent(count, theme, rng) {
  const total = sheetCount(count, 4);
  const shapes = rng.shuffle(SYMMETRY_SHAPES).slice(0, total);
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Mirror halves', `${total} shapes`)}
      <div class="symmetry-grid">
        ${shapes.map((shape) => `<div class="symmetry-card">
          <div class="symmetry-box" aria-hidden="true">
            <svg class="symmetry-svg" viewBox="0 0 100 100">
              <path class="symmetry-half" d="${shape.d}"/>
              <line class="symmetry-line" x1="50" y1="8" x2="50" y2="92"/>
            </svg>
          </div>
          <p class="symmetry-prompt">Finish the other half</p>
        </div>`).join('')}
      </div>
    </section>`,
    answers: [],
    answersNote: 'Symmetry is exploratory here. Praise a careful mirror attempt rather than perfect lines.',
    count: total,
  };
}

function buildShapeSortContent(count, theme, rng) {
  const flat = ['circle', 'square', 'triangle'].map((kind) => ({ type: 'flat', html: shapeSvg(kind, rng.int(0, 3)) }));
  const solid = ['cube', 'sphere', 'cylinder'].map((kind) => ({ type: 'solid', html: SOLID_SVGS[kind] }));
  const bank = rng.shuffle([...flat, ...solid]);
  const flatCount = bank.filter((item) => item.type === 'flat').length;
  const solidCount = bank.filter((item) => item.type === 'solid').length;
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Flat or solid?', 'Sort 6 shapes')}
      <div class="shapesort-wrap">
        <div class="shapesort-bank" aria-hidden="true">${bank.map((item) => `<span class="shapesort-shape shapesort-shape--${item.type}">${item.html}</span>`).join('')}</div>
        <div class="shapesort-bins">
          <div class="shapesort-bin"><span class="shapesort-bin__label">Flat (2D)</span><span class="shapesort-bin__area" aria-hidden="true"></span></div>
          <div class="shapesort-bin"><span class="shapesort-bin__label">Solid (3D)</span><span class="shapesort-bin__area" aria-hidden="true"></span></div>
        </div>
      </div>
    </section>`,
    answers: [`${flatCount} flat, ${solidCount} solid`],
    answersNote: 'Answers are the number of flat and solid shapes in the bank.',
    count: 1,
  };
}

function buildCountOnContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const items = Array.from({ length: total }, () => ({ start: rng.int(5, 15), hops: rng.int(2, 4) }));
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Count on', `${total} hops`)}
      <div class="counton-grid${total > 4 ? ' counton-grid--dense' : ''}">
        ${items.map((item) => `<div class="counton-card">
          <span class="counton-start">Start at <b>${item.start}</b></span>
          ${numberLineSvg(item.start, item.hops, 20)}
          <p class="counton-question">Count on ${item.hops}. Where do you land? ${answerBox()}</p>
        </div>`).join('')}
      </div>
    </section>`,
    answers: items.map((item) => String(item.start + item.hops)),
    answersNote: 'Answers are the landing numbers.',
    count: total,
  };
}

function buildNumberOrderContent(count, theme, rng) {
  const total = sheetCount(count, 5);
  const rows = [];
  for (let i = 0; i < total; i += 1) {
    const start = rng.int(1, 14);
    const terms = Array.from({ length: 4 }, (_, k) => start + k);
    const blank = rng.int(1, 3);
    rows.push({ terms, blank });
  }
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Number order', `${total} rows`)}
      <div class="order-list">
        ${rows.map((row, index) => `<div class="order-row">
          <span class="order-row__num">${index + 1}</span>
          <span class="order-terms">${row.terms.map((term, termIndex) => (termIndex === row.blank ? '<span class="sequence-blank"></span>' : `<span class="sequence-term">${term}</span>`)).join('')}</span>
          <span class="order-row__hint">Smallest → biggest</span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: rows.map((row) => String(row.terms[row.blank])),
    answersNote: 'Answers are the missing numbers in each row.',
    count: total,
  };
}

function buildNumberPatternsContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const sequences = Array.from({ length: total }, () => {
    const step = rng.pick([1, 2, 5, 10]);
    const start = rng.int(1, 6);
    const terms = Array.from({ length: 6 }, (_, k) => start + k * step);
    const blanks = new Set();
    while (blanks.size < 2) blanks.add(rng.int(2, 4));
    return { step, terms, blanks: [...blanks].sort((a, b) => a - b) };
  });
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Number patterns', `${total} patterns`)}
      <div class="sequence-list">
        ${sequences.map((sequence, index) => `<div class="sequence-row">
          <span class="sequence-row__num">${index + 1}</span>
          <span class="sequence-row__step">+${sequence.step}</span>
          <span class="sequence-row__terms">${sequence.terms.map((term, termIndex) => (sequence.blanks.includes(termIndex) ? '<span class="sequence-blank"></span>' : `<span class="sequence-term">${term}</span>`)).join('')}</span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: sequences.map((sequence) => sequence.blanks.map((blank) => sequence.terms[blank]).join(', ')),
    answersNote: 'Answers are the missing numbers in each pattern.',
    count: total,
  };
}

function buildBalanceContent(count, theme, rng) {
  const total = count;
  const problems = [];
  while (problems.length < total) {
    const sum = rng.int(6, 16);
    const a = rng.int(1, sum - 2);
    const b = sum - a;
    const c = rng.int(1, sum - 1);
    const d = sum - c;
    const blank = rng.int(0, 3);
    problems.push({ a, b, c, d, blank, sum });
  }
  const cell = (value, index, problem) => (problem.blank === index ? answerBox('answer-box--small') : `<span>${value}</span>`);
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Balance the equation', `${total} problems`)}
      <ol class="balance-grid">
        ${problems.map((problem) => `<li class="balance-card">
          <span class="balance-side">${cell(problem.a, 0, problem)}<b>+</b>${cell(problem.b, 1, problem)}</span>
          <b class="balance-eq">=</b>
          <span class="balance-side">${cell(problem.c, 2, problem)}<b>+</b>${cell(problem.d, 3, problem)}</span>
        </li>`).join('')}
      </ol>
    </section>`,
    answers: problems.map((problem) => String([problem.a, problem.b, problem.c, problem.d][problem.blank])),
    answersNote: 'Answers are the missing numbers that keep both sides equal.',
    count: total,
  };
}

function buildUnitMeasureContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const items = Array.from({ length: total }, () => ({ cubes: rng.int(3, 8) }));
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Measure with cubes', `${total} objects`)}
      <div class="unitmeasure-list">
        ${items.map((item, index) => `<div class="unitmeasure-card">
          <span class="unitmeasure-no">${index + 1}</span>
          <div class="unitmeasure-object" aria-hidden="true">${theme.emoji.repeat(item.cubes)}</div>
          <span class="unitmeasure-key" aria-hidden="true"><span class="unitmeasure-cube"></span>1 cube</span>
          <p class="unitmeasure-question">How many cubes long? ${answerBox()}</p>
        </div>`).join('')}
      </div>
    </section>`,
    answers: items.map((item) => String(item.cubes)),
    answersNote: 'Answers are the number of cubes that match each picture.',
    count: total,
  };
}

function buildFractionSetContent(count, theme, rng) {
  const total = sheetCount(count, 6);
  const items = Array.from({ length: total }, () => {
    const parts = rng.pick([2, 4]);
    const shaded = rng.int(1, parts - 1);
    return { parts, shaded };
  });
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Fractions of a group', `${total} groups`)}
      <div class="fractionset-grid${total > 4 ? ' fractionset-grid--dense' : ''}">
        ${items.map((item) => `<div class="fractionset-card">
          <div class="fractionset-group" aria-hidden="true">${Array.from({ length: item.parts }, (_, index) => `<span class="fractionset-item${index < item.shaded ? ' is-shaded' : ''}">${theme.emoji}</span>`).join('')}</div>
          <p class="fractionset-question">What fraction is shaded?</p>
          ${answerBox('answer-box--wide')}
        </div>`).join('')}
      </div>
    </section>`,
    answers: items.map((item) => `${item.shaded}/${item.parts}`),
    answersNote: 'Answers are the shaded fractions.',
    count: total,
  };
}

function buildTenMoreLessContent(count, theme, rng) {
  const total = sheetCount(count, 12);
  const values = Array.from({ length: total }, () => rng.int(12, 89));
  return {
    body: `<section class="ws-block">
      ${blockTitle('A', 'Ten more, ten less', `${total} numbers`)}
      <div class="moreless-grid${total > 9 ? ' moreless-grid--dense' : ''}">
        ${values.map((value) => `<div class="moreless-card">
          <span class="moreless-num">${value}</span>
          <span class="moreless-cells">
            <span class="moreless-cell">10 less<i></i></span>
            <span class="moreless-cell">10 more<i></i></span>
          </span>
        </div>`).join('')}
      </div>
    </section>`,
    answers: values.map((value) => `${value - 10}, ${value + 10}`),
    answersNote: 'Answers are ten less and ten more than each number.',
    count: total,
  };
}

function createContent(activity, count, theme, rng, options = {}) {
  if (activity === 'mixed-prek') return buildMixedPreKContent(count, theme, rng, options);
  if (activity === 'trace') return buildTraceContent(count, theme, rng, options.range);
  if (activity === 'count') return buildCountContent(count, theme, rng);
  if (activity === 'shapes') return buildShapesContent(count, theme, rng);
  if (activity === 'compare') return buildCompareContent(count, theme, rng);
  if (activity === 'patterns') return buildPatternsContent(count, theme, rng);
  if (activity === 'tenframe') return buildTenframeContent(count, theme, rng);
  if (activity === 'dice') return buildDiceContent(count, theme, rng);
  if (activity === 'sort') return buildSortContent(count, theme, rng);
  if (activity === 'bonds') return buildBondsContent(count, theme, rng);
  if (activity === 'tally') return buildTallyContent(count, theme, rng);
  if (activity === 'addpics') return buildAddPicsContent(count, theme, rng);
  if (activity === 'subpics') return buildSubPicsContent(count, theme, rng);
  if (activity === 'doubles') return buildDoublesContent(count, theme, rng);
  if (activity === 'beforeafter') return buildBeforeAfterContent(count, theme, rng);
  if (activity === 'skipcount') return buildSkipCountContent(count, theme, rng);
  if (activity === 'greater') return buildGreaterContent(count, theme, rng);
  if (activity === 'place') return buildPlaceContent(count, theme, rng);
  if (activity === 'ordinal') return buildOrdinalContent(count, theme, rng);
  if (activity === 'numberline') return buildNumberLineContent(count, theme, rng);
  if (activity === 'numberwords') return buildNumberWordsContent(count, theme, rng);
  if (activity === 'word') return buildWordContent(count, theme, rng);
  if (activity === 'place100') return buildPlace100Content(count, theme, rng);
  if (activity === 'evenodd') return buildEvenOddContent(count, theme, rng);
  if (activity === 'fractions') return buildFractionsContent(count, theme, rng);
  if (activity === 'time') return buildTimeContent(count, theme, rng);
  if (activity === 'money') return buildMoneyContent(count, theme, rng);
  if (activity === 'factfamily') return buildFactFamilyContent(count, theme, rng);
  if (activity === 'threeadd') return buildThreeAddContent(count, theme, rng);
  if (activity === 'twodigit') return buildTwoDigitContent(count, theme, rng);
  if (activity === 'arrays') return buildArraysContent(count, theme, rng);
  if (activity === 'graph') return buildGraphContent(count, theme, rng, options);
  if (activity === 'rounding') return buildRoundingContent(count, theme, rng);
  if (activity === 'shapes3d') return buildShapes3DContent(count, theme, rng);
  if (activity === 'prewrite') return buildPrewriteContent(count, theme, rng);
  if (activity === 'colors') return buildColorsContent(count, theme, rng);
  if (activity === 'samediff') return buildSameDiffContent(count, theme, rng);
  if (activity === 'position') return buildPositionContent(count, theme, rng);
  if (activity === 'numberhunt') return buildNumberHuntContent(count, theme, rng);
  if (activity === 'dots') return buildDotsContent(count, theme, rng);
  if (activity === 'sortcolor') return buildSortColorContent(count, theme, rng);
  if (activity === 'maketen') return buildMakeTenContent(count, theme, rng);
  if (activity === 'teen') return buildTeenContent(count, theme, rng);
  if (activity === 'measure') return buildMeasureContent(count, theme, rng);
  if (activity === 'symmetry') return buildSymmetryContent(count, theme, rng);
  if (activity === 'shapesort') return buildShapeSortContent(count, theme, rng);
  if (activity === 'counton') return buildCountOnContent(count, theme, rng);
  if (activity === 'numberorder') return buildNumberOrderContent(count, theme, rng);
  if (activity === 'patternsnum') return buildNumberPatternsContent(count, theme, rng);
  if (activity === 'balance') return buildBalanceContent(count, theme, rng);
  if (activity === 'measureunits') return buildUnitMeasureContent(count, theme, rng);
  if (activity === 'fractionsset') return buildFractionSetContent(count, theme, rng);
  if (activity === 'moreless') return buildTenMoreLessContent(count, theme, rng);
  return buildEquationContent(activity, count, theme, rng);
}

/* =========================================================
   Worksheet markup
   ========================================================= */

function worksheetHead(theme, difficulty) {
  return `<div class="ws-topline">
    <div class="ws-brand">${brandSquiggle(30)}<span>SquiggleMath</span></div>
    <span class="ws-theme-pill"><span aria-hidden="true">${theme.emoji}</span> ${theme.name}</span>
  </div>`;
}

function worksheetMeta() {
  return `<div class="ws-meta">
    <span class="ws-meta__item"><span>Name</span><i></i></span>
    <span class="ws-meta__item ws-meta__item--date"><span>Date</span><i></i></span>
  </div>`;
}

function ageClass(difficulty) {
  return `worksheet--${difficulty.className || 'k'}`;
}

function activityFamily(activity) {
  if (['trace', 'prewrite', 'symmetry', 'patterns', 'patternsnum', 'numberwords', 'skipcount'].includes(activity)) return 'trace';
  if (['word'].includes(activity)) return 'read';
  if (['samediff', 'position', 'numberhunt', 'sortcolor', 'shapesort'].includes(activity)) return 'spot';
  if (['measure', 'measureunits'].includes(activity)) return 'measure';
  if (['count', 'shapes', 'colors', 'dots', 'tenframe', 'tally', 'dice', 'graph', 'ordinal', 'numberorder'].includes(activity)) return 'count';
  return 'solve';
}

const STEP_SETS = {
  prek: {
    trace: [['👆', 'Trace with a finger'], ['✏️', 'Trace with a crayon'], ['🌈', 'Colour it in']],
    count: [['👆', 'Point and count'], ['✏️', 'Write the number'], ['🖍️', 'Colour the pictures']],
    read: [['👂', 'Listen to the story'], ['✏️', 'Draw your thinking'], ['🔢', 'Write the answer']],
    spot: [['👀', 'Look closely'], ['☝️', 'Point and name'], ['⭕', 'Circle the answer']],
    measure: [['👀', 'Look at both'], ['📏', 'Compare them'], ['⭕', 'Circle the answer']],
    solve: [['👀', 'Look at the pictures'], ['✏️', 'Trace or write'], ['⭐', 'Check your work']],
  },
  k: {
    trace: [['✏️', 'Trace'], ['✏️', 'Try it alone']],
    count: [['🔢', 'Count'], ['✏️', 'Write the number']],
    read: [['📖', 'Read'], ['✏️', 'Solve and show']],
    spot: [['👀', 'Look closely'], ['⭕', 'Circle or sort']],
    measure: [['📏', 'Compare'], ['⭕', 'Circle the answer']],
    solve: [['🧠', 'Read the sign'], ['✏️', 'Write the answer']],
  },
};

function stepsMarkup(activity, difficulty) {
  if (difficulty.className === 'g1') return '';
  const set = (STEP_SETS[difficulty.className] || STEP_SETS.k)[activityFamily(activity)] || STEP_SETS.k.solve;
  return `<div class="ws-steps" aria-hidden="true">${set.map(([icon, label], index) => `<span class="ws-step"><span class="ws-step__num">${index + 1}</span><span class="ws-step__icon">${icon}</span><span class="ws-step__label">${label}</span></span>`).join('')}</div>`;
}

function themeCheer(theme, activity) {
  const cheers = {
    trace: 'Slow and steady makes the best lines.',
    count: `Let’s count the ${theme.items[0]} together!`,
    read: 'Let’s find out what happens in the story.',
    spot: 'Look closely. Little details matter!',
    measure: 'Which one is longer? Let’s check!',
    solve: 'One little step at a time. You’ve got this!',
  };
  return `${theme.characters[0]} the ${theme.who} says: “${cheers[activityFamily(activity)]}”`;
}

function mascotMarkup(theme, activity) {
  return `<div class="ws-mascot">
    <span class="ws-mascot__face" aria-hidden="true">${theme.emoji}</span>
    <span class="ws-mascot__bubble">${escapeHtml(themeCheer(theme, activity))}</span>
  </div>`;
}

function grownupMarkup(difficulty) {
  if (difficulty.className !== 'prek') return '';
  return `<div class="ws-grownup">
    <span class="ws-grownup__icon" aria-hidden="true">💡</span>
    <p><strong>Grown-up corner:</strong> ${escapeHtml(difficulty.tip)} <em>${escapeHtml(difficulty.talk)}</em></p>
  </div>`;
}

function challengeMarkup(difficulty) {
  if (difficulty.className === 'prek') return '';
  return `<div class="ws-challenge">
    <span class="ws-challenge__icon" aria-hidden="true">⭐</span>
    <p><strong>Challenge:</strong> ${escapeHtml(difficulty.extension)}</p>
  </div>`;
}

function worksheetMarkup({ title, subtitle, instruction, body, theme, difficulty, pageLabel, activity }) {
  const stars = difficulty.className === 'prek' ? '☆ ☆ ☆' : difficulty.className === 'k' ? '☆ ☆ ☆ ☆' : '☆ ☆ ☆ ☆ ☆';
  const showMascot = difficulty.className !== 'g1';
  return `<article class="worksheet ${ageClass(difficulty)}" style="--ws-accent:${theme.accent};--ws-accent-soft:${theme.soft};">
    ${worksheetHead(theme, difficulty)}
    <header class="ws-title">
      <p class="ws-kicker">${escapeHtml(difficulty.badge)}</p>
      <h1 class="ws-heading">${escapeHtml(title)}</h1>
      <p class="ws-sub">${escapeHtml(subtitle)}</p>
    </header>
    ${worksheetMeta()}
    ${stepsMarkup(activity, difficulty)}
    <p class="ws-instruction"><span aria-hidden="true">✏️</span><span>${escapeHtml(instruction)}</span></p>
    <div class="ws-body">${body}</div>
    ${showMascot ? mascotMarkup(theme, activity) : ''}
    ${grownupMarkup(difficulty)}
    ${challengeMarkup(difficulty)}
    <div class="ws-reward">
      <span>All done? Colour a star for every try! ${theme.emoji}</span>
      <span class="ws-reward__stars" aria-hidden="true">${stars}</span>
    </div>
    <footer class="ws-footer"><span>${theme.emoji} SquiggleMath</span><span>${escapeHtml(pageLabel)}</span></footer>
  </article>`;
}

function answerKeyMarkup({ answers, title, theme, difficulty, answersNote, pageLabel }) {
  return `<article class="worksheet ${ageClass(difficulty)} worksheet--key" style="--ws-accent:${theme.accent};--ws-accent-soft:${theme.soft};">
    ${worksheetHead(theme, difficulty)}
    <header class="ws-title">
      <p class="ws-kicker">For grown-ups</p>
      <h1 class="ws-heading">Answer key</h1>
      <p class="ws-sub">${escapeHtml(title)}</p>
    </header>
    <div class="key-meta"><span><strong>${escapeHtml(difficulty.badge)}</strong></span><span>${answers.length} answers</span><span>${theme.emoji} ${theme.name}</span></div>
    <div class="ws-body">
      <div class="key-grid">
        ${answers.map((answer, index) => `<span class="key-item"><b>${index + 1}</b><span>${escapeHtml(answer)}</span></span>`).join('')}
      </div>
      <p class="key-note">${escapeHtml(answersNote)} ${answersNote.endsWith('.') ? '' : '.'} Give lots of high-fives and take a wiggle break whenever it helps!</p>
    </div>
    <footer class="ws-footer"><span>${theme.emoji} SquiggleMath</span><span>${escapeHtml(pageLabel)}</span></footer>
  </article>`;
}

/* Sparse sheets get a dotted "extra thinking" area so the printable never
   ends in a large empty gap. Pre-K gets a drawing invitation instead of a
   "show your work" box, and the threshold is lower because big items already
   leave generous white space. Word-problem sheets have their own workbox. */
function addThinkingSpace(root) {
  if (!root) return;
  root.querySelectorAll('.worksheet:not(.worksheet--key)').forEach((sheet) => {
    if (sheet.querySelector('.word-workbox') || sheet.querySelector('.ws-workzone')) return;
    const body = sheet.querySelector('.ws-body');
    if (!body) return;
    const isPrek = sheet.classList.contains('worksheet--prek');
    const gap = Number.parseFloat(getComputedStyle(body).rowGap) || 0;
    const children = [...body.children];
    const used = children.reduce((total, child) => total + child.offsetHeight, 0);
    const free = body.clientHeight - used - gap * Math.max(0, children.length - 1);
    if (free < (isPrek ? 120 : 170)) return;

    const workzone = document.createElement('div');
    workzone.className = `ws-workzone${isPrek ? ' ws-workzone--prek' : ''}`;
    workzone.innerHTML = isPrek
      ? '<div class="ws-workzone__head"><span aria-hidden="true">🖍️</span><span>Doodle zone — draw something from your sheet.</span></div><div class="ws-workzone__area" aria-hidden="true"></div>'
      : '<div class="ws-workzone__head"><span aria-hidden="true">✏️</span><span>Extra thinking space — doodle, count, or show your work.</span></div><div class="ws-workzone__area" aria-hidden="true"></div>';
    body.appendChild(workzone);
  });
}

function buildWorksheet(config) {
  const difficulty = DIFFICULTIES[config.difficulty || config.category] || DIFFICULTIES.prek;
  const theme = THEMES[config.theme] || THEMES.dinos;
  const activity = config.activity || defaultActivityFor(config.difficulty || config.category);
  const levelMax = difficulty.maxProblems || MAX_PROBLEMS;
  const levelDefault = difficulty.defaultProblems || 10;
  const requestedCount = Number.parseInt(config.problems, 10);
  const count = Math.max(1, Math.min(Number.isFinite(requestedCount) ? requestedCount : levelDefault, levelMax));
  const seed = Number(config.seed) || randomSeed();
  const rng = createRng(seed);
  const title = config.title || defaultTitle(activity, theme);
  const subtitle = config.subtitle || defaultSubtitle(activity, theme);
  const instruction = config.instruction || defaultInstruction(activity);
  const content = createContent(activity, count, theme, rng, config);
  const answers = content.answers || [];
  const actualCount = Number.isFinite(content.count) ? content.count : count;
  const includeKey = Boolean(config.includeKey) && answers.length > 0;
  const totalPages = includeKey ? 2 : 1;

  let html = worksheetMarkup({
    title,
    subtitle,
    instruction,
    body: content.body,
    theme,
    difficulty,
    activity,
    pageLabel: totalPages > 1 ? `Page 1 of ${totalPages}` : 'Print & play',
  });

  if (includeKey) {
    html += answerKeyMarkup({
      answers,
      title,
      theme,
      difficulty,
      answersNote: content.answersNote,
      pageLabel: `Page 2 of ${totalPages}`,
    });
  }

  return {
    html,
    title,
    activity,
    difficulty,
    theme,
    count: actualCount,
    seed,
    answers,
    pageCount: totalPages,
  };
}

/* =========================================================
   Shared public API
   ========================================================= */

window.SquiggleMath = {
  DIFFICULTIES,
  THEMES,
  ACTIVITY_INFO,
  LEVEL_PLAN,
  CATALOG,
  CATALOG_PLAN,
  ACTIVITY_GROUPS,
  catalogFor,
  activitiesFor,
  generatorActivitiesFor,
  CATALOG_BY_CATEGORY,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  MAX_PROBLEMS,
  generatorActivitiesFor,
  findSheet,
  buildWorksheet,
  createRng,
  randomSeed,
  escapeHtml,
  brandSquiggle,
  dashedGlyph,
  shapeSvg,
  tallyMarks,
  addThinkingSpace,
};

})();
