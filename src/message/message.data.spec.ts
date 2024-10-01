import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema } from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { getTestConfiguration } from '../configuration/configuration-manager.utils';

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig = getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(async () => {
    await messageData.deleteMany();
  });

  afterEach(async () => {
    await messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      expect(message).toMatchObject({
        likes: [],
        resolved: false,
        deleted: false,
        reactions: [],
        text: 'Hello world',
        senderId: senderId,
        conversationId: conversationId,
        conversation: { id: conversationId.toHexString() },
        likesCount: 0,
        sender: { id: senderId.toHexString() },
      });
    });
  });

  describe('get', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(
        sentMessage.id.toHexString(),
      );

      expect(gotMessage).toMatchObject(sentMessage);
    });
  });

  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);

      // And that is it now deleted
      const retrievedMessage = await messageData.getMessage(
        message.id.toHexString(),
      );
      expect(retrievedMessage.deleted).toEqual(true);
    });
  });

  describe('addTags', () => {
    it('should be defined', () => {
      expect(messageData.addTags).toBeDefined();
    });

    it('successfully adds tags to a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to tags' },
        senderId,
      );

      const tagsToAdd = ['important', 'urgent'];

      const updatedMessage = await messageData.addTags(message.id, tagsToAdd);

      expect(updatedMessage.tags).toEqual(expect.arrayContaining(tagsToAdd));

      // Verify that the tags were actually saved to the database
      const retrievedMessage = await messageData.getMessage(
        message.id.toHexString(),
      );
      expect(retrievedMessage.tags).toEqual(expect.arrayContaining(tagsToAdd));
    });

    it('successfully adds tags to a message with existing tags', async () => {});
  });

  describe('find tags', () => {
    it('should be defined', () => {
      expect(messageData.findTags).toBeDefined();
    });

    it('returns an empty array if no messages have tags', async () => {
      const tags = await messageData.findTags([]);
      expect(tags).toEqual([]);
    });

    it('returns an empty array when given null', async () => {
      const tags = await messageData.findTags(null);
      expect(tags).toEqual([]);
    });

    it('returns empty array when no messages match the given tags', async () => {
      const conversationId = new ObjectID();
      await messageData.create(
        { conversationId, text: 'Message 1', tags: ['tag1', 'tag2'] },
        senderId,
      );

      const result = await messageData.findTags(['nonexistent']);
      expect(result).toEqual([]);
    });

    //TODO: Add more tests where messages have matching tags
  });
});
