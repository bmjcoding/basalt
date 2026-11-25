# diagram-export

Added for you when a diagram's JSON says `"export": true`.

- The figure's foot gets "Download SVG" and "Download PNG", and so does its viewer's (the drawn layout at 100%, whatever the zoom). Each writes the figure in the theme shown: the title and source, the drawing and the key, at rest; native SVG with its words as text and the faces embedded; the PNG at 2x.
- The PNG is drawn through an image: under a content policy, `img-src` must allow `blob:` or `data:`. Where it allows neither, "Download PNG" makes no file, says so under the buttons and is switched off; the console names the `img-src` it needs; "Download SVG" needs neither.
- Without `"export": true` there are no buttons and no module. Don't add your own.
