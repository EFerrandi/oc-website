# UI Contract: Visible Tags and Preserved Line Breaks

## Gallery Filters

- Render every gender choice and every available character tag visibly, with no collapsed disclosure control.
- Gender uses one mutually exclusive choice, including the existing “Any” option.
- Character tags remain independent multi-select checkboxes.
- Changing a gender radio choice or tag checkbox immediately submits the existing GET form when JavaScript is available.
- Each submission includes all current filter selections; the server-rendered selected state is reloadable and shareable by URL.
- Without JavaScript, the existing form submit button applies the same selections.
- Controls remain keyboard-operable with visible focus indicators and do not cause horizontal overflow on narrow screens.

## Authored Text

- Character Personality and Physical Description, full inline story bodies, standalone story bodies, and Terms of use preserve single line breaks and blank-line paragraph separation.
- CRLF, LF, and CR line endings render consistently.
- Empty and whitespace-only passages do not generate empty sections or paragraphs.
- Content is rendered as escaped text; line breaks do not enable HTML interpretation.
- Image short descriptions, labels, and truncated story previews are not reformatted by this change.

## Content Rating

- Story visibility remains determined by the existing server-side NSFW preference.
- Formatting changes do not introduce new access paths or include hidden story text in a response.
