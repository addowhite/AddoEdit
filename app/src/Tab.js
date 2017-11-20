import React, { Component } from 'react'

class Tab extends Component {
  render() {
    return (
      <div className={this.props.selected ? "tab selected" : "tab"} onClick={this.props.onClick}>
        <p>{this.props.name}</p>
        <span className="close-button" onClick={this.props.onClose}></span>
      </div>
    )
  }
}

export default Tab
