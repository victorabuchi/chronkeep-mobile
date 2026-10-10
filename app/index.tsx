import { Redirect } from 'expo-router';
import { useToken } from '../lib/session';

export default function Index() {
  return <Redirect href={useToken() ? '/calendar' : '/login'} />;
}
