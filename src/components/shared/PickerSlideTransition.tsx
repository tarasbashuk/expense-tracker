'use client';

import { forwardRef, isValidElement } from 'react';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';

const PickerSlideTransition = forwardRef<unknown, TransitionProps>(
  function PickerSlideTransition({ children, ...props }, ref) {
    if (!isValidElement(children)) return null;

    return (
      <Slide {...props} direction="up" ref={ref}>
        {children}
      </Slide>
    );
  },
);

export default PickerSlideTransition;
