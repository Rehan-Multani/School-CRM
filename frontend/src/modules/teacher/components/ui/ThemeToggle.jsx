import { createThemeToggle } from '../../../../shared/ui/ThemeToggle';
import { useTeacherTheme } from '../../context/TeacherThemeContext';

export const ThemeToggle = createThemeToggle(useTeacherTheme, 'teacher-theme-toggle');
export default ThemeToggle;
