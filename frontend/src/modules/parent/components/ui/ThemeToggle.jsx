import { createThemeToggle } from '../../../../shared/ui/ThemeToggle';
import { useParentTheme } from '../../context/ParentThemeContext';

export const ThemeToggle = createThemeToggle(useParentTheme, 'parent-theme-toggle');
export default ThemeToggle;
