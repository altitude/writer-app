import React from 'react';

export const Box = (children) => {
  return (
    <div className="flex p-2 mt-2 mb-2 box">
      {children}
    </div>
  );
}