import { Redirect } from 'expo-router';
import { ROLES } from '../api/roles';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { role } = useAuth();
  return <Redirect href={role ? ROLES[role].home : '/login'} />;
}
