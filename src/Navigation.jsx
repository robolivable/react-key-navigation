import React from 'react'
import PropTypes from 'prop-types'

import VerticalList from './VerticalList.jsx'

/*
 * This component listen the window keys events.
 */

const gLast = arr => arr[arr.length - 1]
const gDirectionFromEvent = e => {
  return ((e.keyCode === KEYBOARD_LEFT.code) && KEYBOARD_LEFT.alias) ||
         ((e.keyCode === KEYBOARD_UP.code) && KEYBOARD_UP.alias) ||
         ((e.keyCode === KEYBOARD_RIGHT.code) && KEYBOARD_RIGHT.alias) ||
         ((e.keyCode === KEYBOARD_DOWN.code) && KEYBOARD_DOWN.alias)
}

const KEYBOARD_ALT = { code: 0x12, name: 'Alt' }
const KEYBOARD_CTRL = { code: 0x11, name: 'Control' }
const KEYBOARD_META = { code: 0x5b, name: 'Meta', alias: 'command' }
const KEYBOARD_SHIFT = { code: 0x10, name: 'Shift' }
const KEYBOARD_LEFT = { code: 0x25, name: 'ArrowLeft', alias: 'left' }
const KEYBOARD_UP = { code: 0x26, name: 'ArrowUp', alias: 'up' }
const KEYBOARD_RIGHT = { code: 0x27, name: 'ArrowRight', alias: 'right' }
const KEYBOARD_DOWN = { code: 0x28, name: 'ArrowDown', alias: 'down' }
const KEYBOARD_ENTER = { code: 0xd, name: 'Enter', alias: 'enter' }

class Navigation extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.currentFocusedPath = []
    this.defaultFocus = null
    this.focusableComponents = {}
    this.focusableIds = 0
    this.lastDirection = ''
    this.lastFocusedPath = []
    this.root = null
    this._onKeyDown = this._onKeyDown.bind(this)
    this.fireEvent = this.fireEvent.bind(this)
    this.focusNext = this.focusNext.bind(this)
    this.blur = this.blur.bind(this)
    this.focus = this.focus.bind(this)
    this.focusDefault = this.focusDefault.bind(this)
    this.setDefault = this.setDefault.bind(this)
    this.addComponent = this.addComponent.bind(this)
    this.forceFocus = this.forceFocus.bind(this)
    this.removeFocusableId = this.removeFocusableId.bind(this)
  }

  componentDidMount () {
    if (this.onKeyUp) {
      window.addEventListener('keyup', this.onKeyUp)
    }
    window.addEventListener('keydown', this._onKeyDown)
    this.focusDefault()
  }

  getChildContext () {
    return { navigationComponent: this }
  }

  render () {
    return (
      <VerticalList
        ref={element => { this.root = element }}
        focusableId='navigation'
      >
        { this.props.children }
      </VerticalList>
    )
  }

  _onKeyDown (e) {
    switch (e.keyCode) {
      case (KEYBOARD_LEFT.code):
      case (KEYBOARD_UP.code):
      case (KEYBOARD_RIGHT.code):
      case (KEYBOARD_DOWN.code):
        let nextFocusedPath = this.lastFocusedPath
        if (this.currentFocusedPath.length) {
          nextFocusedPath = this.currentFocusedPath
        }

        if (nextFocusedPath.length) {
          const direction = gDirectionFromEvent(e)
          this.focusNext(direction, nextFocusedPath)
        }
        e.preventDefault()
        e.stopPropagation()
        return
      case (KEYBOARD_ENTER.code):
        if (!this.currentFocusedPath.length) {
          break
        }
        const element = gLast(this.currentFocusedPath)
        this.fireEvent(element, 'enter-down')
      case (KEYBOARD_ALT.code):
      case (KEYBOARD_CTRL.code):
      case (KEYBOARD_META.code):
      case (KEYBOARD_SHIFT.code):
      default:
        break
    }
  }

  fireEvent (element, evt, evtProps) {
    switch (evt) {
      case 'willmove':
        if (element.props.onWillMove) {
          element.props.onWillMove(evtProps)
        }
        break
      case 'onfocus':
        element.focus(evtProps)
        break
      case 'onblur':
        element.blur(evtProps)
        break
      case 'enter-down':
        if (element.props.onEnterDown) {
          element.props.onEnterDown(evtProps, this)
        }
        break
      default:
        return false
    }
    return true
  }

  focusNext (direction, focusedPath) {
    const next = gLast(focusedPath).getNextFocusFrom(direction)

    if (next) {
      this.lastDirection = direction
      this.focus(next)
    }
  }

  blur (nextTree) {
    if (this.currentFocusedPath === null) {
      return
    }

    let changeNode = null

    const pathLength = Math.min(nextTree.length, this.currentFocusedPath.length)
    for (let i = 0; i < pathLength; i = i + 1) {
      if (nextTree[i] === this.currentFocusedPath[i]) {
        continue
      }
      changeNode = i
      break
    }

    if (changeNode === null) {
      return
    }

    for (let i = changeNode; i < this.currentFocusedPath.length; i = i + 1) {
      this.currentFocusedPath[i].blur()

      if (!(i < this.currentFocusedPath.length - 1)) {
        continue
      }
      this.currentFocusedPath[i].lastFocusChild =
        this.currentFocusedPath[i + 1].indexInParent
    }
  }

  focus (next) {
    this.blur(next.treePath)
    next.focus()

    const lastPath = this.currentFocusedPath
    this.currentFocusedPath = next.treePath
    this.lastFocusedPath = lastPath
  }

  focusDefault () {
    if (this.defaultFocus !== null) {
      this.focus(this.defaultFocus)
    } else {
      this.focus(this.root.getDefaultFocus())
    }
  }

  setDefault (component) {
    if (component.isContainer()) {
      this.defaultFocus = component.getDefaultFocus()
    } else {
      this.defaultFocus = component
    }
  }

  addComponent (component, id = null) {
    if (this.focusableComponents[id]) {
      return id
    }

    if (!id) {
      id = 'focusable-' + this.focusableIds++
    }

    this.focusableComponents[id] = component
    return id
  }

  forceFocus (focusableId) {
    if (!this.focusableComponents[focusableId]) {
      throw new Error(
        'Focusable component with id "' + focusableId + '" doesn\'t exist!'
      )
    }

    this.focus(this.focusableComponents[focusableId].getDefaultFocus())
  }

  removeFocusableId (focusableId) {
    if (this.focusableComponents[focusableId]) {
      delete this.focusableComponents[focusableId]
    }
  }
}

Navigation.childContextTypes = {
  navigationComponent: PropTypes.object
}

export default Navigation
