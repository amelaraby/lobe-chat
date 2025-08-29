'use client';

import { ChatInput, ChatInputActionBar } from '@lobehub/editor/react';
import { createStyles } from 'antd-style';
import dynamic from 'next/dynamic';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import ActionBar from '../ActionBar';
import InputEditor from '../InputEditor';
import SendArea from '../SendArea';
import { useChatInput } from '../hooks/useChatInput';

const FilePreview = dynamic(() => import('./FilePreview'), { ssr: false });

const useStyles = createStyles(({ css, token }) => ({
  container: css``,
  fullscreen: css`
    position: absolute;
    z-index: 100;
    inset: 0;

    width: 100%;
    height: 100%;
    padding: 12px;

    background: ${token.colorBgContainer};
  `,
}));

const DesktopChatInput = memo(() => {
  const { slashMenuRef, expand, actions } = useChatInput();

  const { styles, cx } = useStyles();

  const fileNode = actions.flat().includes('fileUpload') && <FilePreview />;

  return (
    <>
      {!expand && fileNode}
      <Flexbox
        className={cx(styles.container, expand && styles.fullscreen)}
        paddingBlock={'0 12px'}
        paddingInline={12}
      >
        <ChatInput
          footer={
            <ChatInputActionBar
              left={<div />}
              right={<SendArea />}
              style={{
                paddingRight: 8,
              }}
            />
          }
          fullscreen={expand}
          header={<ChatInputActionBar left={<ActionBar />} />}
          slashMenuRef={slashMenuRef}
        >
          <InputEditor defaultRows={1} />
          {expand && fileNode}
        </ChatInput>
      </Flexbox>
    </>
  );
});

DesktopChatInput.displayName = 'DesktopChatInput';

export default DesktopChatInput;
