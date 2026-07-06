// Centralized icon exports to avoid Turbopack chunk loading issues
// This file pre-loads all icons to prevent dynamic import errors

export { 
  FiFile, 
  FiChevronRight, 
  FiChevronDown,
  FiGithub 
} from 'react-icons/fi';

export {
  BsFolderFill,
  BsFolder2Open,
  // Bootstrap's CSS filetype icon: the Simple Icons equivalent was renamed
  // between react-icons 5.5 (SiCss3) and 5.6 (SiCss), so it breaks whenever
  // node_modules and the code disagree on the version.
  BsFiletypeCss
} from 'react-icons/bs';

export {
  SiJavascript,
  SiReact,
  SiJson
} from 'react-icons/si';
