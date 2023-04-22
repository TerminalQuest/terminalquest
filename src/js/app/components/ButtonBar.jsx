import React from 'react';

export default class ButtonBar extends React.Component {
  buttonClick(index) {
    this.props.onClick(index);
  }

  render() {
    const buttons = this.props.buttonLabels.map((label, index) => {
      const spacerClass =
        this.props.buttonLabels.length > index + 1 ? 'buttonSpacer' : '';
      const buttonClass = this.props.selectedIndex === index ? 'active' : '';
      return (
        <div className="buttonContainer" key={`${label}-${index}`}>
          <button
            className={buttonClass}
            onClick={() => this.buttonClick(index)}
          >
            <div>{label}</div>
          </button>
          <span className={spacerClass} />
        </div>
      );
    });

    return (
      <div className="ButtonBar">
        <span className="leftCap" />
        {buttons}
        <span className="rightCap" />
      </div>
    );
  }
}
