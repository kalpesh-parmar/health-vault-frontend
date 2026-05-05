import 'styled-components/native';
import { AppTheme } from '../constants/theme';

declare module 'styled-components/native' {
  export interface DefaultTheme extends AppTheme {}
}
