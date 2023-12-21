import React from 'react';
import { IInputs } from './generated/ManifestTypes';
import { AppContext } from './contexts/AppContext';

export const App = (props: { context: ComponentFramework.Context<IInputs>; }) => {
  const {
    context
  } = props;

  return (
    <AppContext.Provider value={{{ context }}}>
    </AppContext.Provider>
  );
};

App.displayName = 'App';
