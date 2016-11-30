import React from 'react'
import qwery from 'qwery'
import { connect } from 'react-redux'

import {
  Editor,
  EditorState,
  SelectionState,
  RichUtils,
  AtomicBlockUtils,
  Entity,
  Modifier
} from 'draft-js';

import * as editorActions from '../../actions/EditorActions'

import ContentEditorEmbedToolbar from './ContentEditorEmbedToolbar.jsx'
import ContentEditorEmbed from './ContentEditorEmbed.jsx'
import ContentStateHelper from './ContentStateHelper'

// Helper functions
function buildEmbedMap(embeds) {
  let embedMap = {}

  for(var i = 0; i < embeds.length; i++) {
    embedMap[embeds[i].type] = embeds[i]
  }

  return embedMap
}

function blockStyleFn(contentBlock) {
  const type = contentBlock.getType();
  const baseStyle = 'c-content-editor__editor__block c-content-editor__editor__block'

  switch(type) {
    case 'unstyled':
      return baseStyle + '--unstyled';
    case 'atomic':
      return baseStyle + '--embed';
  }
}

class ContentEditorComponent extends React.Component {

  constructor(props) {
    super(props)

    this.onChange = this.onChange.bind(this)
    this.handleKeyCommand = this.handleKeyCommand.bind(this)
    this.blockRenderer = this.blockRenderer.bind(this)
    this.startEditingEntity = this.startEditingEntity.bind(this)
    this.stopEditingEntity = this.stopEditingEntity.bind(this)
    this.insertEmbed = this.insertEmbed.bind(this)
    this.removeEmbed = this.removeEmbed.bind(this)

    this.embedMap = buildEmbedMap(this.props.embeds)

    this.state = {
      readOnly: false,
      showEmbedToolbar: false,
      embedToolbarOffset: 0,
      activeBlock: null
    }

    this.initializeEditor()

  }

  initializeEditor() {
    if (this.props.isNew) {
      this.props.updateEditor(
        EditorState.createEmpty()
      )
    } else {
      this.props.updateEditor(
        EditorState.createWithContent(
          ContentStateHelper.fromJSON(this.props.content)
        )
      )
    }
  }

  onChange(editorState) {
    this.props.updateEditor(editorState)
    this.props.onUpdate(editorState.getCurrentContent())
  }

  handleKeyCommand(command) {
    const newState = RichUtils.handleKeyCommand(this.props.editorState, command)
    if (newState) {
      this.onChange(newState)
      return 'handled'
    }
    return 'not-handled'
  }

  insertEmbed(type, data={}) {

    // Get active block key
    const blockKey = this.state.activeBlock

    // Create new entity with given type and data
    const entityKey = Entity.create(type, 'IMMUTABLE', data)

    // Fetch editorState and contentState
    let editorState = this.props.editorState
    let contentState = editorState.getCurrentContent()

    // Add entity to contentState
    const contentStateWithEntity = Modifier.applyEntity(
      contentState,
      contentState.getSelectionAfter(),
      entityKey
    )

    // Update editorState with new contentState
    editorState = EditorState.set(
      editorState,
      {'currentContent': contentStateWithEntity}
    )

    // Insert atomic block
    editorState = AtomicBlockUtils.insertAtomicBlock(editorState, entityKey, ' ')

    // Fetch the new contentState
    contentState = editorState.getCurrentContent()

    // Remove the empty block from the blockMap
    let blockMap = contentState.getBlockMap()
    contentState = contentState.set('blockMap', blockMap.delete(blockKey))

    // Update editorState with new contentState
    editorState = EditorState.set(
      editorState,
      {currentContent: contentState}
    )

    this.onChange(editorState)

  }

  removeEmbed(blockKey) {

    // Fetch editorState and contentState
    let editorState = this.props.editorState
    let contentState = editorState.getCurrentContent()

    // Remove the block from the blockMap
    let blockMap = contentState.getBlockMap()
    contentState = contentState.set('blockMap', blockMap.delete(blockKey))

    // Update editorState with new contentState
    editorState = EditorState.set(
      editorState,
      {currentContent: contentState}
    )

    this.onChange(editorState)
  }

  startEditingEntity() {
    this.setState({ readOnly: true })
  }

  stopEditingEntity() {
    this.setState({ readOnly: false })
  }

  blockRenderer(contentBlock) {
    const type = contentBlock.getType()

    if (type === 'atomic') {
      const embedType = Entity.get(contentBlock.getEntityAt(0)).getType()
      const embed = this.embedMap[embedType]

      return {
        component: ContentEditorEmbed,
        editable: false,
        props: {
          type: embedType,
          embedComponent: embed.component,
          onFocus: this.startEditingEntity,
          onBlur: this.stopEditingEntity,
          removeEmbed: this.removeEmbed,
          openModal: this.props.openModal,
          closeModal: this.props.closeModal,
          modal: embed.modal,
          modalCallback: embed.modalCallback
        }
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    let contentState = this.props.editorState.getCurrentContent()
    let key = this.props.editorState.getSelection().getStartKey()
    let block = contentState.getBlockForKey(key)

    if (!block) {
      return;
    }

    if (!block.getText()) {
      let blockNode = qwery(`div[data-offset-key="${key}-0-0"]`)[0]

      if (!blockNode) {
        return
      }

      let offset = blockNode.offsetTop

      if (this.state.embedToolbarOffset !== offset || !this.state.showEmbedToolbar) {
        this.setState({
          embedToolbarOffset: offset,
          showEmbedToolbar: true,
          activeBlock: key
        })
      }

    } else {
      if (this.state.showEmbedToolbar) {
        this.setState({
          showEmbedToolbar: false
        })
      }
    }
  }

  render() {
    return (
      <div className='c-content-editor'>
        <div className='c-content-editor__editor'>
          <Editor
            readOnly={this.state.readOnly}
            editorState={this.props.editorState}
            handleKeyCommand={this.handleKeyCommand}
            blockRendererFn={this.blockRenderer}
            blockStyleFn={blockStyleFn}
            onChange={this.onChange} />
        </div>
        <ContentEditorEmbedToolbar
          embeds={this.props.embeds}
          showToolbar={this.state.showEmbedToolbar}
          offset={this.state.embedToolbarOffset}
          insertEmbed={this.insertEmbed}
          openModal={this.props.openModal}
          closeModal={this.props.closeModal} />
      </div>
    )
  }
}


const mapStateToProps = (state) => {
  return { editorState: state.app.editor }
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateEditor: (editorState) => {
      dispatch(editorActions.updateEditor(editorState))
    }
  }
}

const ContentEditor = connect(
  mapStateToProps,
  mapDispatchToProps
)(ContentEditorComponent)

export default ContentEditor