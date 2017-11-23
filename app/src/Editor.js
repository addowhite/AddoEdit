import React, { Component } from 'react'

// Ace editor imports
import AceEditor from 'react-ace'
import brace from 'brace'
import 'brace/ext/language_tools'
import langDef from './language_and_theme_def.js'
Object.values(langDef.languages).forEach((languageName) => require(`brace/mode/${languageName}`))
langDef.themes.forEach((themeName) => require(`brace/theme/${themeName}`))

const electron = window.require('electron')
const ipcRenderer = electron.ipcRenderer
const fs = window.require('fs')
const app = electron.remote.app

class Editor extends Component {

  constructor(props, content) {
    super(props, content)
    this.onEditorLoad   = this.onEditorLoad.bind(this)
    this.onEditorChange = this.onEditorChange.bind(this)
    this.getCurrentFile = this.getCurrentFile.bind(this)

    this.editor = undefined

    this.state = {
      theme: 'twilight',
      fontSize: 14,
      showGutter: true,
      showPrintMargin: false,
      highlightActiveLine: true,
      enableSnippets: false,
      showLineNumbers: true,
      tabSize: 2,
      hidden: false
    }

    this.settingsFilePath = app.getPath('userData') + '\\settings.json'

    ipcRenderer.on('font-size-change', (ev, data) => this.setState({ fontSize : data.msg }, this.saveSettings))
    ipcRenderer.on('tab-size-change' , (ev, data) => this.setState({ tabSize  : data.msg }, this.saveSettings))

    ipcRenderer.on('theme-change', (ev, data) => {
      this.setState({ theme    : data.msg }, () => {
        this.updateTabStyles()
        this.saveSettings()
      })
    })
  }

  updateTabStyles(css) {
    let editor = document.getElementsByClassName('ace_editor')[0]
    let backgroundColor = window.getComputedStyle(editor ,null).getPropertyValue('background-color')
    this.tabCssText.nodeValue = `.tab-stream { background-color: ${backgroundColor}; }`
  }

  getCurrentFile() {
    return this.props.files[this.props.currentFileId]
  }

  loadSettings() {
    if (fs.existsSync(this.settingsFilePath)) {
      fs.readFile(this.settingsFilePath, 'utf-8', (error, data) => {
        if (error) {
          alert('Failed to load settings. ' + error.message)
          return
        }

        let newState = JSON.parse(data)
        newState.currentFilePath = ''
        if (newState.tabIndex > this.props.files.length - 1)
          newState.tabIndex = -1
        this.setState(newState)
      })
    }
  }

  saveSettings() {
    let stateCopy = {}
    for (let prop in this.state)
      if (this.state.hasOwnProperty(prop) && prop !== 'value')
        stateCopy[prop] = this.state[prop]

    fs.writeFileSync(this.settingsFilePath, JSON.stringify(stateCopy), (error) => !error || alert('Failed save settings. ' + error.message))
  }

  onEditorLoad(editor) {
    this.editor = editor
    this.loadSettings()
    editor.commands.addCommand({
      name: "save",
      bindKey: { win: "Ctrl-S", mac: "Command-S" },
      exec: () => ipcRenderer.send('file-save')
    })
    editor.commands.addCommand({
      name: "open",
      bindKey: { win: "Ctrl-O", mac: "Command-O" },
      exec: () => ipcRenderer.send('file-choose-open')
    })

    this.tabCssText = document.createTextNode('')
    this.tabStyle = document.createElement('style')
    this.tabStyle.type = 'text/css'
    this.tabStyle.appendChild(this.tabCssText)
    document.head.appendChild(this.tabStyle)

    this.updateTabStyles()

    ipcRenderer.send('editor-ready')
  }

  onEditorChange(newValue) {
    let file = this.getCurrentFile()
    if (file) file.contents = newValue
  }

  render() {
    return (
      <div className='editor' style={{ display: this.props.files.hasOwnProperty(this.props.currentFileId) ? 'block' : 'none' }}>
        <AceEditor
          value={this.props.files.hasOwnProperty(this.props.currentFileId) ? this.props.files[this.props.currentFileId].contents : ''}
          theme={this.state.theme}
          mode={langDef.languages[this.props.files.hasOwnProperty(this.props.currentFileId) ? this.props.files[this.props.currentFileId].ext : 'txt']}
          enableBasicAutocompletion={true}
          enableLiveAutocompletion={true}
          fontSize={this.state.fontSize}
          showGutter={this.state.showGutter}
          showPrintMargin={this.state.showPrintMargin}
          highlightActiveLine={this.state.highlightActiveLine}
          enableSnippets={this.state.enableSnippets}
          showLineNumbers={this.state.showLineNumbers}
          onLoad={this.onEditorLoad}
          onChange={this.onEditorChange}
          onBlur={this.onEditorBlur}
          tabSize={this.state.tabSize}
          focus={true}
          name='editor'
          width='100%'
          height='100%'
          setOptions={{
            scrollPastEnd: true,
            fadeFoldWidgets: true,
            useWorker: false
          }}
          editorProps={{
            $blockScrolling: Infinity
          }}
        />
      </div>
    )
  }

}

export default Editor
