import React from 'react';
import EntryScreen from './screens/EntryScreen';
import SelectorScreen from './screens/SelectorScreen';
import StudioScreen from './screens/StudioScreen';
import { useStore } from './store';

export default function App() {
  const screen = useStore(s => s.screen);
  
  if (screen === 'entry') return <EntryScreen />;
  if (screen === 'selector') return <SelectorScreen />;
  if (screen === 'studio') return <StudioScreen />;
  
  return <div style={{color: 'white', padding: 20}}>Unknown screen</div>;
}