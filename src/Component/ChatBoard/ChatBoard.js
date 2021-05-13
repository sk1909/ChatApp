import moment from 'moment'
import React, {Component} from 'react'
import ReactLoading from 'react-loading'
import 'react-toastify/dist/ReactToastify.css'
import {myFirestore, myStorage} from '../../Config/MyFirebase'
import images from '../Themes/Images'
import './ChatBoard.css'
import {AppString} from './../Const'

export default class ChatBoard extends Component {
    constructor(props) {
        super(props)
        this.state = {
            isLoading: false,
            isShowSticker: false,
            inputValue: ''
        }
        this.currentUserId = localStorage.getItem(AppString.ID)
        this.currentUserAvatar = localStorage.getItem(AppString.PHOTO_URL)
        this.currentUserNickname = localStorage.getItem(AppString.NICKNAME)
        this.listMessage = []
        this.currentPeerUser = this.props.currentPeerUser
        this.groupChatId = null
        this.removeListener = null
        this.currentPhotoFile = null
    }

    componentDidUpdate() {
        this.scrollToBottom()
    }

    componentDidMount() {
        // For first render, it's not go through componentWillReceiveProps
        this.getListHistory()
    }

    componentWillUnmount() {
        if (this.removeListener) {
            this.removeListener()
        }
    }

    componentWillReceiveProps(newProps) {
        if (newProps.currentPeerUser) {
            this.currentPeerUser = newProps.currentPeerUser
            this.getListHistory()
        }
    }

    getListHistory = () => {
        if (this.removeListener) {
            this.removeListener()
        }
        this.listMessage.length = 0
        this.setState({isLoading: true})
        if (
            this.hashString(this.currentUserId) <=
            this.hashString(this.currentPeerUser.id)
        ) {
            this.groupChatId = `${this.currentUserId}-${this.currentPeerUser.id}`
        } else {
            this.groupChatId = `${this.currentPeerUser.id}-${this.currentUserId}`
        }

        // Get history and listen new data added
        this.removeListener = myFirestore
            .collection(AppString.NODE_MESSAGES)
            .doc(this.groupChatId)
            .collection(this.groupChatId)
            .onSnapshot(
                snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === AppString.DOC_ADDED) {
                            this.listMessage.push(change.doc.data())
                        }
                    })
                    this.setState({isLoading: false})
                },
                err => {
                    this.props.showToast(0, err.toString())
                }
            )
    }

    openListSticker = () => {
        this.setState({isShowSticker: !this.state.isShowSticker})
    }

    onSendMessage = (content, type) => {
        if (this.state.isShowSticker && type === 2) {
            this.setState({isShowSticker: false})
        }

        if (content.trim() === '') {
            return
        }

        const timestamp = moment()
            .valueOf()
            .toString()

        const itemMessage = {
            idFrom: this.currentUserId,
            idTo: this.currentPeerUser.id,
            timestamp: timestamp,
            content: content.trim(),
            type: type
        }

        myFirestore
            .collection(AppString.NODE_MESSAGES)
            .doc(this.groupChatId)
            .collection(this.groupChatId)
            .doc(timestamp)
            .set(itemMessage)
            .then(() => {
                this.setState({inputValue: ''})
            })
            .catch(err => {
                this.props.showToast(0, err.toString())
            })
    }

    onChoosePhoto = event => {
        if (event.target.files && event.target.files[0]) {
            this.setState({isLoading: true})
            this.currentPhotoFile = event.target.files[0]
            // Check this file is an image?
            const prefixFiletype = event.target.files[0].type.toString()
            if (prefixFiletype.indexOf(AppString.PREFIX_IMAGE) === 0) {
                this.uploadPhoto()
            } else {
                this.setState({isLoading: false})
                this.props.showToast(0, 'This file is not an image')
            }
        } else {
            this.setState({isLoading: false})
        }
    }

    uploadPhoto = () => {
        if (this.currentPhotoFile) {
            const timestamp = moment()
                .valueOf()
                .toString()

            const uploadTask = myStorage
                .ref()
                .child(timestamp)
                .put(this.currentPhotoFile)

            uploadTask.on(
                AppString.UPLOAD_CHANGED,
                null,
                err => {
                    this.setState({isLoading: false})
                    this.props.showToast(0, err.message)
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                        this.setState({isLoading: false})
                        this.onSendMessage(downloadURL, 1)
                    })
                }
            )
        } else {
            this.setState({isLoading: false})
            this.props.showToast(0, 'File is null')
        }
    }

    onKeyboardPress = event => {
        if (event.key === 'Enter') {
            this.onSendMessage(this.state.inputValue, 0)
        }
    }

    scrollToBottom = () => {
        if (this.messagesEnd) {
            this.messagesEnd.scrollIntoView({})
        }
    }

    render() {
        return (
            <div className="viewChatBoard">
                {/* Header */}
                <div className="headerChatBoard">
                    <img
                        className="viewAvatarItem"
                        src={this.currentPeerUser.photoUrl}
                        alt="icon avatar"
                    />
                    <span className="textHeaderChatBoard">
            {this.currentPeerUser.nickname}
          </span>
                </div>

                {/* List message */}
                <div className="viewListContentChat">
                    {this.renderListMessage()}
                    <div
                        style={{float: 'left', clear: 'both'}}
                        ref={el => {
                            this.messagesEnd = el
                        }}
                    />
                </div>

                {/* Stickers */}
                {this.state.isShowSticker ? this.renderStickers() : null}

                {/* View bottom */}
                <div className="viewBottom">
                    <img
                        className="icOpenGallery"
                        src="data:image/jpeg;base64,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"
                        alt="gallery"
                        onClick={() => this.refInput.click()}
                    />
                    <input
                        ref={el => {
                            this.refInput = el
                        }}
                        accept="image/*"
                        className="viewInputGallery"
                        type="file"
                        onChange={this.onChoosePhoto}
                    />

                    <img
                        className="icOpenSticker"
                        src="data:image/png;base64,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"
                        alt="emoji"
                        onClick={this.openListSticker}
                    />

                    <input
                        className="viewInput"
                        placeholder="Type your message..."
                        value={this.state.inputValue}
                        onChange={event => {
                            this.setState({inputValue: event.target.value})
                        }}
                        onKeyPress={this.onKeyboardPress}
                    />
                    <img
                        className="icSend"
                        src="data:image/jpeg;base64,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"
                        alt="send icon"
                        onClick={() => this.onSendMessage(this.state.inputValue, 0)}
                    />
                </div>

                {/* Loading */}
                {this.state.isLoading ? (
                    <div className="viewLoading">
                        <ReactLoading
                            type={'spin'}
                            color={'#203152'}
                            height={'3%'}
                            width={'3%'}
                        />
                    </div>
                ) : null}
            </div>
        )
    }

    renderListMessage = () => {
        if (this.listMessage.length > 0) {
            let viewListMessage = []
            this.listMessage.forEach((item, index) => {
                if (item.idFrom === this.currentUserId) {
                    // Item right (my message)
                    if (item.type === 0) {
                        viewListMessage.push(
                            <div className="viewItemRight" key={item.timestamp}>
                                <span className="textContentItem">{item.content}</span>
                            </div>
                        )
                    } else if (item.type === 1) {
                        viewListMessage.push(
                            <div className="viewItemRight2" key={item.timestamp}>
                                <img
                                    className="imgItemRight"
                                    src={item.content}
                                    alt="content message"
                                />
                            </div>
                        )
                    } else {
                        viewListMessage.push(
                            <div className="viewItemRight3" key={item.timestamp}>
                                <img
                                    className="imgItemRight"
                                    src={this.getGifImage(item.content)}
                                    alt="content message"
                                />
                            </div>
                        )
                    }
                } else {
                    // Item left (peer message)
                    if (item.type === 0) {
                        viewListMessage.push(
                            <div className="viewWrapItemLeft" key={item.timestamp}>
                                <div className="viewWrapItemLeft3">
                                    {this.isLastMessageLeft(index) ? (
                                        <img
                                            src={this.currentPeerUser.photoUrl}
                                            alt="avatar"
                                            className="peerAvatarLeft"
                                        />
                                    ) : (
                                        <div className="viewPaddingLeft"/>
                                    )}
                                    <div className="viewItemLeft">
                                        <span className="textContentItem">{item.content}</span>
                                    </div>
                                </div>
                                {this.isLastMessageLeft(index) ? (
                                    <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                                ) : null}
                            </div>
                        )
                    } else if (item.type === 1) {
                        viewListMessage.push(
                            <div className="viewWrapItemLeft2" key={item.timestamp}>
                                <div className="viewWrapItemLeft3">
                                    {this.isLastMessageLeft(index) ? (
                                        <img
                                            src={this.currentPeerUser.photoUrl}
                                            alt="avatar"
                                            className="peerAvatarLeft"
                                        />
                                    ) : (
                                        <div className="viewPaddingLeft"/>
                                    )}
                                    <div className="viewItemLeft2">
                                        <img
                                            className="imgItemLeft"
                                            src={item.content}
                                            alt="content message"
                                        />
                                    </div>
                                </div>
                                {this.isLastMessageLeft(index) ? (
                                    <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                                ) : null}
                            </div>
                        )
                    } else {
                        viewListMessage.push(
                            <div className="viewWrapItemLeft2" key={item.timestamp}>
                                <div className="viewWrapItemLeft3">
                                    {this.isLastMessageLeft(index) ? (
                                        <img
                                            src={this.currentPeerUser.photoUrl}
                                            alt="avatar"
                                            className="peerAvatarLeft"
                                        />
                                    ) : (
                                        <div className="viewPaddingLeft"/>
                                    )}
                                    <div className="viewItemLeft3" key={item.timestamp}>
                                        <img
                                            className="imgItemLeft"
                                            src={this.getGifImage(item.content)}
                                            alt="content message"
                                        />
                                    </div>
                                </div>
                                {this.isLastMessageLeft(index) ? (
                                    <span className="textTimeLeft">
                    {moment(Number(item.timestamp)).format('ll')}
                  </span>
                                ) : null}
                            </div>
                        )
                    }
                }
            })
            return viewListMessage
        } else {
            return (
                <div className="viewWrapSayHi">
                    <span className="textSayHi">Say hi to new friend</span>
                    <img
                        className="imgWaveHand"
                        src={images.ic_wave_hand}
                        alt="wave hand"
                    />
                </div>
            )
        }
    }

    renderStickers = () => {
        return (
            <div className="viewStickers">
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlMhZGmM6tRQAzVyo7i_MJ5t12-pATSErsIA&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlMhZGmM6tRQAzVyo7i_MJ5t12-pATSErsIA&usqp=CAU', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7wzYx6S_QiQ6fcO5IfzrYSVqE_jm7hL5N_A&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi2', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdyyJd5Cg01wSW41jEFmz4wLvdRpCPRGWxOg&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi3', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmceHzVGS8mNQeWEtL9XT-jfdGovMRLtHkaA&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi4', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8SLG71eCdcO7z-zwGlFfB_-mDptDC0LfyMA&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi5', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlMoyv3v3PcUaFzOKIi6_mYW_9fZG5yi9zsg&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi6', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbfObWHOGn9DLfwLR5vtb7voKmApfERpXQNw&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi7', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwQB_5Dhu0qRDWmDyX8yCgYcoPfD20SmqDpQ&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi8', 2)}
                />
                <img
                    className="imgSticker"
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWmqpkYl2BoiKwQi7_HP9-EQUR0VGi_TO9CA&usqp=CAU"
                    alt="sticker"
                    onClick={() => this.onSendMessage('mimi9', 2)}
                />
            </div>
        )
    }

    hashString = str => {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash += Math.pow(str.charCodeAt(i) * 31, str.length - i)
            hash = hash & hash // Convert to 32bit integer
        }
        return hash
    }

    getGifImage = value => {
        switch (value) {
            case 'mimi1':
                return images.mimi1
            case 'mimi2':
                return images.mimi2
            case 'mimi3':
                return images.mimi3
            case 'mimi4':
                return images.mimi4
            case 'mimi5':
                return images.mimi5
            case 'mimi6':
                return images.mimi6
            case 'mimi7':
                return images.mimi7
            case 'mimi8':
                return images.mimi8
            case 'mimi9':
                return images.mimi9
            default:
                return null
        }
    }

    isLastMessageLeft(index) {
        if (
            (index + 1 < this.listMessage.length &&
                this.listMessage[index + 1].idFrom === this.currentUserId) ||
            index === this.listMessage.length - 1
        ) {
            return true
        } else {
            return false
        }
    }

    isLastMessageRight(index) {
        if (
            (index + 1 < this.listMessage.length &&
                this.listMessage[index + 1].idFrom !== this.currentUserId) ||
            index === this.listMessage.length - 1
        ) {
            return true
        } else {
            return false
        }
    }
}
