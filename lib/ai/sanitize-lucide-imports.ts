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

  const validNames: string[] = [];

  for (const name of rawNames) {
    // Handle `Icon as Alias` syntax.
    const aliasMatch = name.match(/^(\w+)\s+as\s+(\w+)$/);
    const realName = aliasMatch ? aliasMatch[1] : name;
    const alias = aliasMatch ? aliasMatch[2] : realName;

    let finalName = INVALID_ICON_ALIASES[realName] || realName;
    if (!VALID_LUCIDE_ICONS.has(finalName)) {
      finalName = 'Circle';
    }

    // If the alias matches the final name, no alias needed.
    if (alias === finalName) {
      if (!validNames.includes(finalName)) validNames.push(finalName);
    } else {
      const aliased = `${finalName} as ${alias}`;
      if (!validNames.includes(aliased)) validNames.push(aliased);
    }
  }

  if (validNames.length === 0) {
    return "import { Circle } from 'lucide-react';";
  }

  return `import { ${validNames.join(', ')} } from 'lucide-react';`;
}

/**
 * Sanitize every `lucide-react` import line in a source string.
 */
export function sanitizeLucideImports(source: string): string {
  return source.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"]\s*;?/g,
    rewriteLucideImportLine
  );
}

/**
 * Validate whether a specific icon name exists in lucide-react.
 */
export function isValidLucideIcon(name: string): boolean {
  return VALID_LUCIDE_ICONS.has(name);
}
