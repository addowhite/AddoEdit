import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'

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
const fs = window.require('fs')
const app = electron.remote.app
const ipcRenderer = electron.ipcRenderer

function cancelEvent(ev) {
  ev.preventDefault()
  ev.stopPropagation()
  return false
}

class App extends Component {

  constructor(props, content) {
    super(props, content)
    this.onEditorLoad   = this.onEditorLoad.bind(this)
    this.onEditorChange = this.onEditorChange.bind(this)
    this.onEditorBlur   = this.onEditorBlur.bind(this)
    this.onDrop         = this.onDrop.bind(this)

    this.state = {
      currentFilePath: '',
      value: '',
      theme: 'xcode',
      mode: 'java',
      fontSize: 14,
      showGutter: true,
      showPrintMargin: false,
      highlightActiveLine: true,
      enableSnippets: true,
      showLineNumbers: true,
      tabSize: 2
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

    document.addEventListener('dragover', cancelEvent)
    document.addEventListener('drop', this.onDrop)

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

    ipcRenderer.on('file-open', (ev, data) => {
      this.loadFile(data.msg[0])
    })
  }

  loadSettings() {
    if (fs.existsSync(this.settingsFilePath)) {
      fs.readFile(this.settingsFilePath, 'utf-8', (error, data) => {
        if (error) {
          alert('Failed to load settings. ' + error.message)
          return
        }

        this.setState(JSON.parse(data))

        if (this.state.currentFilePath !== '')
          this.loadFile(this.state.currentFilePath)
      })
    }
  }

  saveSettings() {
    let stateCopy = {}
    for (let prop in this.state)
      if (this.state.hasOwnProperty(prop) && prop !== 'value')
        stateCopy[prop] = this.state[prop]

    fs.writeFile(this.settingsFilePath, JSON.stringify(stateCopy), (error) => {
      if (error) {
        alert('Failed save settings. ' + error.message)
        return
      }
    })
  }

  saveCurrentBufferAsync(filePath) {
    fs.writeFile(filePath, this.state.value, (error) => {
      if (error) {
        alert('Failed to write file: \'' + filePath + '\'. ' + error.message)
        return
      }
    })
  }

  saveCurrentBuffer(filePath) {
    try {
      fs.writeFileSync(filePath, this.state.value, 'utf-8')
    } catch(e) {
      alert('Failed to save file!')
    }
  }

  loadFile(filePath) {
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        alert('Failed to read file: \'' + filePath + '\'. ' + error.message)
        return
      }

      this.setState({
        value: data,
        mode: this.fileExtensions[filePath.substr(filePath.lastIndexOf('.') + 1)],
        currentFilePath: filePath
      })

      this.saveSettings()
    })
  }

  onDrop(ev) {
    if (!ev || !ev.dataTransfer || !ev.dataTransfer.files || !ev.dataTransfer.files[0] || !ev.dataTransfer.files[0].path) return
    let filePath = ev.dataTransfer.files[0].path
    if (filePath !== '')
      this.loadFile(filePath)
    return cancelEvent(ev)
  }

  onEditorBlur(ev) {
    if (this.state.currentFilePath !== '')
      this.saveCurrentBufferAsync(this.state.currentFilePath)
  }

  onEditorLoad(editor) {
    this.loadSettings()
  }

  onEditorChange(newValue) {
    this.setState({ value: newValue })
  }

  render() {
    return (
      <div className='App'>
        <AceEditor
          value={this.state.value}
          theme={this.state.theme}
          mode={this.state.mode}
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
        />
      </div>
    )
  }

}

export default App
