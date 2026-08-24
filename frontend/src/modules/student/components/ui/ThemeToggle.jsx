import { createThemeToggle } from '../../../../shared/ui/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = createThemeToggle(useTheme);
export default ThemeToggle;
