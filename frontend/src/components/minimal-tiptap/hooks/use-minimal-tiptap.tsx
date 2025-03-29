import { useEditor } from '@tiptap/react';
import type { Content } from '@tiptap/react';

export interface UseMinimalTiptapEditorProps {
    immediateInput?: boolean;
    onUpdate?: (value: Content) => void;
}

export const useMinimalTiptapEditor = ({
    immediateInput = false,
    onUpdate,
}: UseMinimalTiptapEditorProps) => {
    const editor = useEditor({
        editorProps: {
            handleKeyDown: immediateInput
                ? (view, event) => {
                    const charactersToHandle = [' ', ',', '.', '!', '?', ':', ';', '(', ')', '[', ']', '{', '}', '+', '-', '*', '/', '=', '<', '>', '&', '|', '^', '~'];

                    if (charactersToHandle.includes(event.key)) {
                        view.dispatch(view.state.tr.insertText(event.key));

                        if (onUpdate) {
                            const htmlContent = view.dom.innerHTML;
                            onUpdate(htmlContent);
                        }

                        event.preventDefault();
                        return true;
                    }

                    return false;
                }
                : undefined,
        },
        onUpdate: ({ editor }) => {
            if (onUpdate) {
                if (editor.options.autofocus !== 'end') {
                    onUpdate(editor.getHTML());
                }
            }
        },
    });

    return editor;
};