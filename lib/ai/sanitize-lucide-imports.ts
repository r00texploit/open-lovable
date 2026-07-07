/**
 * Sanitize `lucide-react` imports in generated code.
 *
 * The AI sometimes invents icon names that don't exist in the library (e.g.
 * `Facebook`). This helper removes invalid named imports and replaces their
 * JSX usages with a safe fallback so the Vite app doesn't crash at runtime.
 */

// A broad set of real named exports from `lucide-react`. This list is
// conservative and covers the icons the AI most commonly uses.
const VALID_LUCIDE_ICONS = new Set([
  // Common UI
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ArrowUpRight',
  'Check', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
  'ChevronUp', 'ChevronsDown', 'ChevronsLeft', 'ChevronsRight', 'ChevronsUp',
  'Circle', 'Clock', 'Copy', 'Close', 'X', 'Menu', 'MoreHorizontal',
  'MoreVertical', 'Minus', 'Plus', 'PlusCircle', 'Search', 'Trash2', 'XCircle',
  // Social / brand-like (not all exist, keep only real ones)
  'Github', 'Twitter', 'Linkedin', 'Instagram', 'Youtube', 'Mail', 'Phone',
  'Globe', 'Link', 'ExternalLink', 'Send', 'MessageCircle', 'MessageSquare',
  // Common objects
  'Calendar', 'Camera', 'CreditCard', 'Download', 'Upload', 'Edit', 'Eye',
  'EyeOff', 'File', 'FileText', 'Filter', 'Flag', 'Folder', 'FolderOpen',
  'Gift', 'Heart', 'Home', 'Image', 'Inbox', 'Info', 'Key', 'Layers', 'Layout',
  'List', 'Lock', 'MapPin', 'Maximize', 'Minimize', 'Monitor', 'Moon', 'Sun',
  'Music', 'Package', 'Paperclip', 'Percent', 'Play', 'Pause', 'RefreshCw',
  'Save', 'Server', 'Settings', 'Share', 'Shield', 'ShoppingBag', 'ShoppingCart',
  'Star', 'Store', 'Tag', 'Target', 'ThumbsUp', 'Tool', 'Truck', 'User', 'Users',
  'Video', 'Wallet', 'Wifi', 'Zap',
  // Navigation / actions
  'AlignCenter', 'AlignLeft', 'AlignRight', 'Bold', 'Italic', 'Underline',
  'BarChart', 'PieChart', 'LineChart', 'Activity', 'TrendingUp', 'TrendingDown',
  'Bell', 'BookOpen', 'Bookmark', 'Briefcase', 'Brush', 'Bucket', 'Calculator',
  'Car', 'CaseSensitive', 'CircleDot', 'Clipboard', 'Code', 'Coffee', 'Columns',
  'Command', 'Compass', 'Contact', 'Contrast', 'Cookie', 'Cpu', 'Crop',
  'Crosshair', 'Database', 'Diamond', 'Disc', 'DollarSign', 'Droplet', 'Egg',
  'Eraser', 'Euro', 'Feather', 'Figma', 'FileCode', 'FileJson', 'FilePlus',
  'FileType', 'Files', 'Film', 'Fingerprint', 'Fish', 'Flame', 'Flashlight',
  'Flower', 'Flower2', 'Focus', 'Footprints', 'Frame', 'Framer', 'Frown',
  'Gamepad', 'Gauge', 'Gem', 'Ghost', 'Glasses', 'Globe2', 'GraduationCap',
  'Grid', 'GripHorizontal', 'GripVertical', 'Hammer', 'Hand', 'HardDrive',
  'Hash', 'Headphones', 'Highlighter', 'History', 'Hop', 'Hourglass', 'IceCream',
  'IdCard', 'Indent', 'IndianRupee', 'JapaneseYen', 'Keyboard', 'Lamp',
  'Languages', 'Laptop', 'Laugh', 'Leaf', 'Library', 'LifeBuoy', 'Lightbulb',
  'Loader', 'Loader2', 'Locate', 'LocateFixed', 'LocateOff', 'LockKeyhole',
  'LogIn', 'LogOut', 'Luggage', 'Magnet', 'Map', 'Martini', 'Maximize2',
  'Medal', 'Megaphone', 'Mic', 'MicOff', 'Minimize2', 'MonitorOff',
  'MonitorSmartphone', 'MousePointer', 'MousePointer2', 'MousePointerClick',
  'Move', 'Navigation', 'Navigation2', 'Network', 'Newspaper', 'Octagon',
  'Option', 'Outdent', 'Paintbrush', 'PaintBucket', 'Palette', 'Pencil',
  'PencilLine', 'Pentagon', 'Percent', 'PersonStanding', 'PiggyBank', 'Pilcrow',
  'Pin', 'PinOff', 'Pipette', 'Plane', 'PlayCircle', 'Plug', 'PlugZap', 'Plus',
  'PlusSquare', 'Pocket', 'Pointer', 'Power', 'PowerOff', 'Printer', 'Projector',
  'Puzzle', 'QrCode', 'Quote', 'Radio', 'RadioReceiver', 'RectangleHorizontal',
  'RectangleVertical', 'Recycle', 'Redo', 'Redo2', 'Repeat', 'Reply',
  'ReplyAll', 'Rocket', 'RollerCoaster', 'Rotate3d', 'RotateCcw', 'RotateCw',
  'Rss', 'Ruler', 'RussianRuble', 'Scale', 'Scan', 'ScanFace', 'ScanLine',
  'Scissors', 'ScreenShare', 'Scroll', 'ScrollText', 'SdCard', 'Separator',
  'Shapes', 'Share2', 'Sheet', 'ShieldAlert', 'ShieldCheck', 'ShieldOff',
  'Shirt', 'ShoppingBasket', 'Shovel', 'ShowerHead', 'Shrink', 'Shrub',
  'Shuffle', 'Sidebar', 'SidebarClose', 'SidebarOpen', 'Sigma', 'Signal',
  'SignalHigh', 'SignalLow', 'SignalMedium', 'SignalZero', 'Siren', 'Sketch',
  'SkipBack', 'SkipForward', 'Skull', 'Slack', 'Slash', 'Sliders', 'Smartphone',
  'Smile', 'Snowflake', 'Soup', 'Space', 'Sparkles', 'Speaker', 'Spline',
  'Split', 'Sprout', 'Square', 'SquareStack', 'Stack', 'Stamp', 'StarHalf',
  'StarOff', 'StepBack', 'StepForward', 'Stethoscope', 'Sticker', 'StickyNote',
  'StopCircle', 'Subscript', 'SunDim', 'SunMedium', 'SunMoon', 'Sunrise',
  'Sunset', 'Superscript', 'SwatchBook', 'SwissFranc', 'SwitchCamera',
  'Sword', 'Swords', 'Syringe', 'Table', 'Table2', 'Tablet', 'Tag', 'Tags',
  'Target', 'Tent', 'Terminal', 'TerminalSquare', 'Text', 'TextCursor',
  'TextCursorInput', 'Thermometer', 'ThermometerSnowflake', 'ThermometerSun',
  'Ticket', 'Timer', 'TimerOff', 'TimerReset', 'ToggleLeft', 'ToggleRight',
  'Tornado', 'Touchpad', 'Train', 'TrainFront', 'TramFront', 'Trash',
  'TreeDeciduous', 'TreePine', 'Trees', 'Trello', 'Triangle', 'Trophy',
  'Truck', 'Turtle', 'Tv', 'Tv2', 'Twitch', 'Type', 'Umbrella', 'Underline',
  'Undo', 'Undo2', 'Unlink', 'Unlock', 'UnlockKeyhole', 'UploadCloud', 'Usb',
  'UserCheck', 'UserCog', 'UserMinus', 'UserPlus', 'UserX', 'Users2', 'Utensils',
  'UtensilsCrossed', 'Vegan', 'VenetianMask', 'Verified', 'Vibrate',
  'VibrateOff', 'VideoOff', 'Videotape', 'View', 'Voicemail', 'Volume',
  'Volume1', 'Volume2', 'VolumeX', 'Wallet', 'Wallpaper', 'Wand', 'Wand2',
  'Watch', 'Webhook', 'Wheat', 'WifiOff', 'Wind', 'Wine', 'WrapText', 'Wrench',
  'XOctagon', 'XSquare', 'ZoomIn', 'ZoomOut',
]);

// Aliases that don't exist but the AI often tries to use.
const INVALID_ICON_ALIASES: Record<string, string> = {
  Facebook: 'Globe',
  TwitterOld: 'Twitter',
  LinkedIn: 'Linkedin',
  GithubAlt: 'Github',
  InstagramAlt: 'Instagram',
  YouTube: 'Youtube',
};

function rewriteLucideImportLine(line: string): string {
  const importMatch = line.match(
    /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]\s*;?/
  );
  if (!importMatch) return line;

  const rawNames = importMatch[1]
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  // ES modules forbid importing the same exported name twice (even with
  // different aliases). The AI often aliases the same fallback icon several
  // times (e.g. several invalid icon names all mapping to `Circle`), which
  // produced `import { Circle as A, Circle as B, ... }` and a Babel
  // "Identifier 'Circle' has already been declared" SyntaxError. Import each
  // exported icon once and bind extra aliases via `const` after the import.
  const localBindings = new Map<string, string>(); // exportedName -> local name
  const importSpecifiers: string[] = [];
  const localAliases: string[] = [];

  const ensureImported = (exportedName: string, localName: string): string => {
    if (!localBindings.has(exportedName)) {
      localBindings.set(exportedName, localName);
      importSpecifiers.push(
        localName === exportedName ? exportedName : `${exportedName} as ${localName}`
      );
      return localName;
    }
    return localBindings.get(exportedName)!;
  };

  for (const name of rawNames) {
    // Handle `Icon as Alias` syntax.
    const aliasMatch = name.match(/^(\w+)\s+as\s+(\w+)$/);
    const realName = aliasMatch ? aliasMatch[1] : name;
    const alias = aliasMatch ? aliasMatch[2] : realName;

    let finalName = INVALID_ICON_ALIASES[realName] || realName;
    if (!VALID_LUCIDE_ICONS.has(finalName)) {
      finalName = 'Circle';
    }

    const binding = ensureImported(finalName, alias);
    if (alias !== binding) {
      localAliases.push(`const ${alias} = ${binding};`);
    }
  }

  if (importSpecifiers.length === 0) {
    return "import { Circle } from 'lucide-react';";
  }

  const importLine = `import { ${importSpecifiers.join(', ')} } from 'lucide-react';`;
  return localAliases.length > 0 ? `${importLine}\n${localAliases.join(' ')}` : importLine;
}

/**
 * Collect all identifiers that are defined or imported in the source.
 * This includes named/default imports, const/let/var, function, and class
 * declarations. Used to determine which PascalCase JSX usages are undefined.
 */
function collectDefinedIdentifiers(source: string): Set<string> {
  const defined = new Set<string>();

  // Named imports: import { A, B as C, D } from '...'
  const namedImportRegex =
    /import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
  let m: RegExpExecArray | null;
  while ((m = namedImportRegex.exec(source)) !== null) {
    m[1].split(',').forEach((spec) => {
      const trimmed = spec.trim();
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) defined.add(asMatch[2]);
      else if (/^\w+$/.test(trimmed)) defined.add(trimmed);
    });
  }

  // Default / namespace imports: import X from '...' / import * as X from '...'
  const defaultImportRegex =
    /import\s+(\w+|\*\s+as\s+\w+)\s+from\s+['"][^'"]+['"]/g;
  while ((m = defaultImportRegex.exec(source)) !== null) {
    const nsMatch = m[1].match(/\*\s+as\s+(\w+)/);
    if (nsMatch) defined.add(nsMatch[1]);
    else if (/^\w+$/.test(m[1])) defined.add(m[1]);
  }

  // Declarations: const/let/var/export const Name = ...
  const declRegex = /\b(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/g;
  while ((m = declRegex.exec(source)) !== null) defined.add(m[1]);

  // Function declarations: function Name(
  const funcRegex = /\b(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g;
  while ((m = funcRegex.exec(source)) !== null) defined.add(m[1]);

  // Class declarations: class Name
  const classRegex = /\b(?:export\s+)?class\s+(\w+)/g;
  while ((m = classRegex.exec(source)) !== null) defined.add(m[1]);

  // Type declarations (TS): interface Name / type Name = ...
  const typeRegex = /\b(?:export\s+)?(?:interface|type)\s+(\w+)/g;
  while ((m = typeRegex.exec(source)) !== null) defined.add(m[1]);

  return defined;
}

// React/HTML built-in PascalCase identifiers and common React component
// names that should NOT be treated as missing lucide icons.
const NON_ICON_PASCAL_IDENTIFIERS = new Set([
  'Fragment', 'Suspense', 'StrictMode', 'Profiler', 'Component',
  'PureComponent', 'React', 'ErrorBoundary',
  // Common app/page/component names — not icons
  'App', 'Root', 'Main', 'Index', 'Home', 'About', 'Contact', 'Blog',
  'Shop', 'Store', 'Cart', 'Checkout', 'Login', 'Signup', 'Register',
  'Dashboard', 'Profile', 'Settings', 'Search', 'Hero', 'Nav', 'Navbar',
  'Sidebar', 'Layout', 'Wrapper', 'Container', 'Provider', 'Context',
  'Router', 'Outlet', 'Link', 'NavLink', 'Route', 'Redirect',
]);

// Suffixes that strongly indicate a React component rather than a lucide
// icon. If a PascalCase identifier ends with one of these, skip it.
const COMPONENT_SUFFIXES = [
  'Card', 'Section', 'Header', 'Footer', 'Navbar', 'Sidebar', 'Banner',
  'Modal', 'Dialog', 'Drawer', 'Popover', 'Tooltip', 'Accordion',
  'Carousel', 'Slider', 'Gallery', 'Grid', 'Table', 'List', 'Item',
  'Form', 'Input', 'Button', 'Select', 'Checkbox', 'Radio', 'Toggle',
  'Tabs', 'Tab', 'Menu', 'Dropdown', 'Breadcrumb', 'Pagination',
  'Widget', 'Panel', 'Bar', 'Loader', 'Spinner', 'Skeleton', 'Badge',
  'Avatar', 'Chip', 'Tag', 'Alert', 'Toast', 'Notification',
  'Page', 'View', 'Screen', 'Route', 'Layout', 'Wrapper', 'Container',
  'Provider', 'Context', 'Hook', 'Controller', 'Manager', 'Handler',
  'Product', 'Category', 'CartItem', 'OrderItem', 'MenuItem',
  'Component', 'Element', 'Block', 'Section', 'Wrapper',
];

/**
 * Heuristic: does this PascalCase identifier look like a lucide icon name
 * rather than a custom React component? Lucide icons are typically short
 * common nouns/objects (Star, Heart, Coffee, CupSoda, ShoppingCart) and
 * don't have component-like suffixes (Card, Section, Header, etc.).
 *
 * Valid lucide icon names always pass (even if they match a suffix like
 * "Menu" or "Tag"), because they are definitely icons.
 */
function looksLikeLucideIcon(name: string): boolean {
  // Valid lucide icons are always icons, even if the name matches a
  // component suffix (e.g. Menu, Tag, Bar, Grid).
  if (VALID_LUCIDE_ICONS.has(name)) return true;
  // React builtins and common component names are never icons.
  if (NON_ICON_PASCAL_IDENTIFIERS.has(name)) return false;
  // For unknown names, check component suffixes — if the name ends with
  // one, it's likely a custom component, not an icon.
  for (const suffix of COMPONENT_SUFFIXES) {
    if (name.endsWith(suffix) && name.length >= suffix.length) {
      return false;
    }
  }
  return true;
}

/**
 * Find PascalCase JSX component usages (`<Foo`, `</Foo>`) that are not
 * defined or imported anywhere in the file AND look like lucide icon names
 * (not custom components). These are almost certainly lucide-react icons
 * the AI forgot to import.
 */
function findUndefinedJsxIdentifiers(
  source: string,
  defined: Set<string>
): string[] {
  const jsxRegex = /<\/?([A-Z][a-zA-Z0-9]*)/g;
  const undefinedNames = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = jsxRegex.exec(source)) !== null) {
    const name = m[1];
    if (!defined.has(name) && looksLikeLucideIcon(name)) {
      undefinedNames.add(name);
    }
  }
  return Array.from(undefinedNames);
}

/**
 * Sanitize every `lucide-react` import line in a source string, AND add
 * fallback imports for any PascalCase JSX usages that are not defined or
 * imported anywhere in the file (e.g. the AI used `<CupSoda />` without
 * importing it).
 */
export function sanitizeLucideImports(source: string): string {
  // 1. Fix existing lucide-react import lines (dedupe, validate, alias).
  let result = source.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"]\s*;?/g,
    rewriteLucideImportLine
  );

  // 2. Detect PascalCase JSX usages that are not defined/imported anywhere.
  //    The AI frequently uses lucide icons in JSX without importing them,
  //    causing `ReferenceError: CupSoda is not defined` at runtime.
  const defined = collectDefinedIdentifiers(result);
  const undefinedIcons = findUndefinedJsxIdentifiers(result, defined);

  if (undefinedIcons.length === 0) return result;

  // 3. Add a fallback import using a unique local alias to avoid conflicts
  //    with any existing `Circle` import. Each undefined icon gets a `const`
  //    alias so JSX usages resolve.
  const fallbackAlias = '__lucideIconFallback';
  const aliasDecls = undefinedIcons
    .map((name) => `const ${name} = ${fallbackAlias};`)
    .join(' ');
  const fallbackBlock = `import { Circle as ${fallbackAlias} } from 'lucide-react';\n${aliasDecls}\n`;

  return fallbackBlock + result;
}

/**
 * Validate whether a specific icon name exists in lucide-react.
 */
export function isValidLucideIcon(name: string): boolean {
  return VALID_LUCIDE_ICONS.has(name);
}
