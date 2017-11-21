import React, { Component } from 'react'
import Tab from './Tab.js'

class TabStream extends Component {

  constructor(props) {
    super(props);
    this.tabs = {};
  }

  render() {
    return (
      <div className="tab-stream">
        {Object.values(this.props.files)
          .sort((a, b) => a.tabOrder - b.tabOrder )
          .map((file) => {
            return (
              <Tab name={file.name}
                   key={file.tabId}
                   onClick={file.onTabClick}
                   onClose={file.onTabClose}
                   selected={file.tabId === this.props.currentFileId} />
            )
          })}
      </div>
    )
  }
}

export default TabStream
