﻿// Copyright 2019 The FairDataSociety Authors
// This file is part of the FairDataSociety library.
//
// The FairDataSociety library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The FairDataSociety library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the FairDataSociety library. If not, see <http://www.gnu.org/licenses/>.

import React from 'react';
import Message from './Messages';
import * as Helpers from './Helpers.js';

class ReceiveMessages extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            account: null,
            receiving: false,
            multiboxData: null,
            receivedMessages: []
        }
    }
    componentDidMount() {
        this.setAccount(this.props.account);
        this.interval = setInterval(() => this.getReceivedMessages(), 5000);
    }

    shouldComponentUpdate(nextProps, nextState) {
        var mustUpdate = (nextProps.account !== this.state.account);

        if (this.state.account === null) {
            if (mustUpdate || this.props.account !== undefined) {
                this.setAccount(this.props.account);
                this.forceUpdate();
            }
        }
        return mustUpdate;
    }

    async setAccount(acc) {
        await this.setState({ account: acc });
        //await this.updateMultibox(acc);
    }
    async setMultiboxData(mbd) {
        this.setState({ multiboxData: mbd });
        this.setState({ mbnonce: this.state.mbnonce + 1 });
    }
    async updateMultibox(account) {
        var multiboxData = await account.Mail.Multibox.traverseMultibox(account, account.subdomain);
        this.setMultiboxData(multiboxData);

        console.log(multiboxData);
    }
    async addReceived(msg) {
        this.setState({ receivedMessages: [msg, ...this.state.receivedMessages] }); 
    }
    async findReceived(msgId) {
        return this.state.receivedMessages.find(msg => msg.id === msgId);
    } 
    
    async getReceivedMessages() {
        if (this.state.receiving) return; 
        if (this.state.account===null) return; 

        await this.setState({ receiving: true });
        let messages = await this.state.account.messages('received', window.FDS.applicationDomain);
        var reader = new FileReader();
        await Helpers.asyncForEach(messages, async (message) => {
            var file = await message.getFile(); // what if this fails? 
            var isCRJWT = Helpers.IsConsentRecepit(file.name);
            var id = Helpers.hashFnv32a(message.hash.address);

            if (!this.findReceived(id)) {
                reader.onload = function (e) {
                    let content = Helpers.ExtractMessage(reader.result);
                    this.addReceived({ id: id, isHidden: false, message: message, content: content, data: reader.result, isConsentRecepit: isCRJWT });
                }
                await reader.readAsText(await this.state.account.receive(message));
            }
        });
        await this.setState({ receiving: false });
    }

    render() {
        if (this.props.account === null) return <div > wait  </div>;
        if (this.state.account === null) return <div > wating for account  </div>;
        if (this.state.receivedMessages === null) return <div > no messages </div>;
        if (this.state.receivedMessages.length === 0 ) return <div > no messages received </div>;
        
        let q = this.props.query;
        let receivedItems = this.state.receivedMessages;
        if (q.length > 0) { // filter results
            receivedItems = receivedItems.filter(m => {
                if (m.isHidden) return false;
                //if (m.sender.search(q) !== -1) return true;
                if (m.contents.search(q) !== -1) return true;
                return false;
            });
        }
        return <div className="receivedMessagesWindow">
            Received: <strong>{this.state.receivedMessages.length} </strong>
            {receivedItems.map(m =>
                <small key={m.id}>
                    <Message message={m} />
                </small>)}
        </div>
    }
}

export default ReceiveMessages;