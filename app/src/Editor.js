import React, { Component } from 'react'

// Ace editor imports
import brace from 'brace'
import AceEditor from 'react-ace'
import 'brace/ext/language_tools'
import 'brace/mode/javascript'
import 'brace/mode/java'
import 'brace/mode/python'
import 'brace/mode/css'
import 'brace/mode/csharp'
import 'brace/mode/mysql'
import 'brace/mode/json'
import 'brace/mode/html'
import 'brace/mode/xml'
import 'brace/mode/php'
import 'brace/mode/text'
import 'brace/theme/monokai'
import 'brace/theme/github'
import 'brace/theme/tomorrow'
import 'brace/theme/kuroir'
import 'brace/theme/twilight'
import 'brace/theme/xcode'
import 'brace/theme/textmate'
import 'brace/theme/solarized_dark'
import 'brace/theme/solarized_light'
import 'brace/theme/terminal'

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

    this.fileExtensions = {
      'js'   : 'javascript',
      'java' : 'java',
      'py'   : 'python',
      'css'  : 'css',
      'cs'   : 'csharp',
      'sql'  : 'mysql',
      'json' : 'json',
      'html' : 'html',
      'xml'  : 'xml',
      'php'  : 'php',
      'txt'  : 'text'
    }

    this.settingsFilePath = app.getPath('userData') + '\\settings.json'

    ipcRenderer.on('theme-change', (ev, data) => {
      this.setState({ theme: data.msg })
      this.saveSettings()
    })

    ipcRenderer.on('font-size-change', (ev, data) => {
      this.setState({ fontSize: data.msg })
      this.saveSettings()
    })

    ipcRenderer.on('tab-size-change', (ev, data) => {
      this.setState({ tabSize: data.msg })
      this.saveSettings()
    })
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

    fs.writeFileSync(this.settingsFilePath, JSON.stringify(stateCopy), (error) => {
      if (error) {
        alert('Failed save settings. ' + error.message)
        return
      }
    })
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
    ipcRenderer.send('editor-ready')
  }

  onEditorChange(newValue) {
    let file = this.getCurrentFile()
    if (file)
      file.contents = newValue
  }

  render() {
    return (
      <div className='editor' style={{ display: this.props.files.hasOwnProperty(this.props.currentFileId) ? 'block' : 'none' }}>
        <AceEditor
          value={this.props.files.hasOwnProperty(this.props.currentFileId) ? this.props.files[this.props.currentFileId].contents : ''}
          theme={this.state.theme}
          mode={this.fileExtensions[this.props.files.hasOwnProperty(this.props.currentFileId) ? this.props.files[this.props.currentFileId].ext : 'txt']}
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
