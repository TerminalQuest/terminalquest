import React, { useRef } from 'react';

const CopyDebugInfoButton = ({
  children,
  shouldNotify,
  doesFeedbackExist,
  disableNotification,
  onClick,
}) => {
  const buttonRef = useRef();

  return (
    <button
      ref={buttonRef}
      className={`get-objective-debug-info ${
        doesFeedbackExist ? 'emphasis' : ''
      } ${shouldNotify ? 'objective-debug-info-copied' : ''}`}
      onClick={() => {
        onClick();
        setTimeout(() => {
          buttonRef.current.classList.add('animateOut');
        }, 3000);
      }}
      onAnimationEnd={event => {
        if (event.animationName === 'tooltipDisappear') {
          disableNotification();
        }
      }}
    >
      {children}
    </button>
  );
};

export default CopyDebugInfoButton;
