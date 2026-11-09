/* Basalt HTML script (window.Basalt). Built by tools/html-skill/build.mjs; do not edit. */
/*! The icon paths below are from Phosphor Icons (@phosphor-icons/react):
MIT License

Copyright (c) 2020 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function () {
'use strict';
var ICONS = {"Command":[["M180,140H164V116h16a40,40,0,1,0-40-40V92H116V76a40,40,0,1,0-40,40H92v24H76a40,40,0,1,0,40,40V164h24v16a40,40,0,1,0,40-40ZM164,76a16,16,0,1,1,16,16H164ZM60,76a16,16,0,0,1,32,0V92H76A16,16,0,0,1,60,76ZM92,180a16,16,0,1,1-16-16H92Zm24-64h24v24H116Zm64,80a16,16,0,0,1-16-16V164h16a16,16,0,0,1,0,32Z"],["M180,144H160V112h20a36,36,0,1,0-36-36V96H112V76a36,36,0,1,0-36,36H96v32H76a36,36,0,1,0,36,36V160h32v20a36,36,0,1,0,36-36ZM160,76a20,20,0,1,1,20,20H160ZM56,76a20,20,0,0,1,40,0V96H76A20,20,0,0,1,56,76ZM96,180a20,20,0,1,1-20-20H96Zm16-68h32v32H112Zm68,88a20,20,0,0,1-20-20V160h20a20,20,0,0,1,0,40Z"]],"Option":[["M236,192a12,12,0,0,1-12,12H160.94a19.89,19.89,0,0,1-17.88-11.06L92.58,92H32a12,12,0,0,1,0-24H95.06a19.89,19.89,0,0,1,17.88,11.06L163.42,180H224A12,12,0,0,1,236,192ZM152,92h72a12,12,0,0,0,0-24H152a12,12,0,0,0,0,24Z"],["M232,192a8,8,0,0,1-8,8H160.94a15.92,15.92,0,0,1-14.31-8.84L95.06,88H32a8,8,0,0,1,0-16H95.06a15.92,15.92,0,0,1,14.31,8.84L160.94,184H224A8,8,0,0,1,232,192ZM152,88h72a8,8,0,0,0,0-16H152a8,8,0,0,0,0,16Z"]],"Control":[["M208.49,128.49a12,12,0,0,1-17,0L128,65,64.49,128.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,128.49Z"],["M205.66,125.66a8,8,0,0,1-11.32,0L128,59.31,61.66,125.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,125.66Z"]],"MagnifyingGlass":[["M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"],["M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"]],"Copy":[["M216,28H88A12,12,0,0,0,76,40V76H40A12,12,0,0,0,28,88V216a12,12,0,0,0,12,12H168a12,12,0,0,0,12-12V180h36a12,12,0,0,0,12-12V40A12,12,0,0,0,216,28ZM156,204H52V100H156Zm48-48H180V88a12,12,0,0,0-12-12H100V52H204Z"],["M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"]],"Check":[["M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"],["M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"]],"Sun":[["M116,36V20a12,12,0,0,1,24,0V36a12,12,0,0,1-24,0Zm80,92a68,68,0,1,1-68-68A68.07,68.07,0,0,1,196,128Zm-24,0a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,128ZM51.51,68.49a12,12,0,1,0,17-17l-12-12a12,12,0,0,0-17,17Zm0,119-12,12a12,12,0,0,0,17,17l12-12a12,12,0,1,0-17-17ZM196,72a12,12,0,0,0,8.49-3.51l12-12a12,12,0,0,0-17-17l-12,12A12,12,0,0,0,196,72Zm8.49,115.51a12,12,0,0,0-17,17l12,12a12,12,0,0,0,17-17ZM48,128a12,12,0,0,0-12-12H20a12,12,0,0,0,0,24H36A12,12,0,0,0,48,128Zm80,80a12,12,0,0,0-12,12v16a12,12,0,0,0,24,0V220A12,12,0,0,0,128,208Zm108-92H220a12,12,0,0,0,0,24h16a12,12,0,0,0,0-24Z"],["M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"]],"Moon":[["M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z"],["M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"]],"Info":[["M108,84a16,16,0,1,1,16,16A16,16,0,0,1,108,84Zm128,44A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Zm-72,36.68V132a20,20,0,0,0-20-20,12,12,0,0,0-4,23.32V168a20,20,0,0,0,20,20,12,12,0,0,0,4-23.32Z"],["M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"]],"Warning":[["M240.26,186.1,152.81,34.23h0a28.74,28.74,0,0,0-49.62,0L15.74,186.1a27.45,27.45,0,0,0,0,27.71A28.31,28.31,0,0,0,40.55,228h174.9a28.31,28.31,0,0,0,24.79-14.19A27.45,27.45,0,0,0,240.26,186.1Zm-20.8,15.7a4.46,4.46,0,0,1-4,2.2H40.55a4.46,4.46,0,0,1-4-2.2,3.56,3.56,0,0,1,0-3.73L124,46.2a4.77,4.77,0,0,1,8,0l87.44,151.87A3.56,3.56,0,0,1,219.46,201.8ZM116,136V104a12,12,0,0,1,24,0v32a12,12,0,0,1-24,0Zm28,40a16,16,0,1,1-16-16A16,16,0,0,1,144,176Z"],["M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"]],"X":[["M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"],["M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"]],"ArrowRight":[["M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z"],["M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"]],"ArrowLeft":[["M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"],["M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"]],"ArrowUp":[["M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"],["M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"]],"ArrowDown":[["M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z"],["M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"]],"CaretDown":[["M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"],["M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"]],"CaretRight":[["M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"],["M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"]],"Plus":[["M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"],["M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"]],"Minus":[["M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128Z"],["M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"]],"Trash":[["M216,48H180V36A28,28,0,0,0,152,8H104A28,28,0,0,0,76,36V48H40a12,12,0,0,0,0,24h4V208a20,20,0,0,0,20,20H192a20,20,0,0,0,20-20V72h4a12,12,0,0,0,0-24ZM100,36a4,4,0,0,1,4-4h48a4,4,0,0,1,4,4V48H100Zm88,168H68V72H188ZM116,104v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Zm48,0v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Z"],["M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"]],"Download":[["M71.51,88.49a12,12,0,0,1,17-17L116,99V24a12,12,0,0,1,24,0V99l27.51-27.52a12,12,0,0,1,17,17l-48,48a12,12,0,0,1-17,0ZM224,116H188a12,12,0,0,0,0,24h32v56H36V140H68a12,12,0,0,0,0-24H32a20,20,0,0,0-20,20v64a20,20,0,0,0,20,20H224a20,20,0,0,0,20-20V136A20,20,0,0,0,224,116Zm-20,52a16,16,0,1,0-16,16A16,16,0,0,0,204,168Z"],["M240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H72a8,8,0,0,1,0,16H32v64H224V136H184a8,8,0,0,1,0-16h40A16,16,0,0,1,240,136Zm-117.66-2.34a8,8,0,0,0,11.32,0l48-48a8,8,0,0,0-11.32-11.32L136,108.69V24a8,8,0,0,0-16,0v84.69L85.66,74.34A8,8,0,0,0,74.34,85.66ZM200,168a12,12,0,1,0-12,12A12,12,0,0,0,200,168Z"]],"ArrowClockwise":[["M244,56v48a12,12,0,0,1-12,12H184a12,12,0,1,1,0-24H201.1l-19-17.38c-.13-.12-.26-.24-.38-.37A76,76,0,1,0,127,204h1a75.53,75.53,0,0,0,52.15-20.72,12,12,0,0,1,16.49,17.45A99.45,99.45,0,0,1,128,228h-1.37A100,100,0,1,1,198.51,57.06L220,76.72V56a12,12,0,0,1,24,0Z"],["M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z"]],"CheckCircle":[["M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z"],["M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"]],"XCircle":[["M168.49,104.49,145,128l23.52,23.51a12,12,0,0,1-17,17L128,145l-23.51,23.52a12,12,0,0,1-17-17L111,128,87.51,104.49a12,12,0,0,1,17-17L128,111l23.51-23.52a12,12,0,0,1,17,17ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z"],["M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"]]};
function esc(s) {
return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}
var warned = {};
function icon(name, opts) {
var o = opts || {};
var weights = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : null;
if (!weights) {
if (!warned[name]) { warned[name] = 1; console.warn('Basalt: unknown icon "' + name + '" (known: ' + Object.keys(ICONS).join(', ') + ')'); }
return '';
}
var size = Number(o.size);
if (!(size > 0 && size < Infinity)) size = 16;
var paths = weights[size >= 20 ? 1 : 0];
var a11y = o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true"';
return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="' + size + '" height="' + size +
'" fill="currentColor" ' + a11y + ' focusable="false">' + paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
}
function hydrateIcons(root) {
(root || document).querySelectorAll('[data-icon]').forEach(function (el) {
el.outerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size || 16), label: el.dataset.label });
});
}
var THEME_KEY = 'basalt-theme';
function getTheme() {
var t = document.documentElement.getAttribute('data-theme');
if (t === 'light' || t === 'dark') return t;
return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function setTheme(theme, persist) {
var t = theme === 'light' ? 'light' : 'dark';
document.documentElement.setAttribute('data-theme', t);
if (persist !== false) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {  } }
document.querySelectorAll('[data-theme-toggle]').forEach(syncThemeButton);
return t;
}
function initTheme() {
var stored = null;
try { stored = localStorage.getItem(THEME_KEY); } catch (e) {  }
var t = stored === 'light' || stored === 'dark' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', t);
return t;
}
function toggleTheme() { return setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }
function syncThemeButton(button) {
var dark = getTheme() === 'dark';
button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
button.innerHTML = icon(dark ? 'Sun' : 'Moon');
}
function wireThemeToggles() {
document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
if (button.__bh) return;
button.__bh = true;
button.type = 'button';
button.addEventListener('click', toggleTheme);
syncThemeButton(button);
});
}
var MOD_ICON = { '⌘': 'Command', '⌥': 'Option', '⌃': 'Control' };
var KEY_NAME = { '⌘': 'Meta', '⌥': 'Alt', '⌃': 'Control', '⇧': 'Shift', '↵': 'Enter', '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', 'Esc': 'Escape', '⌫': 'Backspace', '⇥': 'Tab' };
function kbd(key) {
return '<kbd class="kbd" aria-hidden="true">' + (MOD_ICON[key] ? icon(MOD_ICON[key], { size: 12 }) : esc(key)) + '</kbd>';
}
function kbdGroup(keys) {
return '<span class="kbd-group" aria-hidden="true">' + keys.map(kbd).join('') + '</span>';
}
function keyshortcuts(keys) {
return keys.map(function (k) { return KEY_NAME[k] || (k.length === 1 ? k.toUpperCase() : k); }).join('+');
}
function keywords(keys) {
return keys.map(function (k) { return MOD_ICON[k] || KEY_NAME[k] || k.toUpperCase(); }).join(' ');
}
function hydrateKbd() {
document.querySelectorAll('[data-kbd]').forEach(function (el) {
el.outerHTML = kbdGroup(el.dataset.kbd.trim().split(/\s+/)).replace('class="kbd-group"', 'class="kbd-group"' + (el.hasAttribute('data-doc') ? ' data-doc' : ''));
});
}
var KEYBOARD_KEY = 'basalt-keyboard';
function hardwareKeyboard() { return document.documentElement.getAttribute('data-keyboard') === 'hardware'; }
function isHardwareKey(e) {
if (e.isComposing || e.key === 'Unidentified' || e.key === 'Process' || e.key === 'Dead') return false;
return e.key === 'Tab' || e.key === 'Escape' || e.metaKey || e.ctrlKey || e.altKey;
}
function initKeyboard() {
var root = document.documentElement;
try { if (sessionStorage.getItem(KEYBOARD_KEY) === 'hardware') root.setAttribute('data-keyboard', 'hardware'); } catch (e) {  }
if (hardwareKeyboard() || root.__bhKeys) return;
root.__bhKeys = true;
var onKey = function (e) {
if (!isHardwareKey(e)) return;
document.removeEventListener('keydown', onKey, true);
root.setAttribute('data-keyboard', 'hardware');
try { sessionStorage.setItem(KEYBOARD_KEY, 'hardware'); } catch (err) {  }
};
document.addEventListener('keydown', onKey, { capture: true, passive: true });
}
function announce(text) {
var live = document.getElementById('basalt-live');
if (!live) {
live = document.createElement('div');
live.id = 'basalt-live';
live.className = 'visually-hidden';
live.setAttribute('role', 'status');
document.body.appendChild(live);
}
live.textContent = '';
setTimeout(function () { live.textContent = text; }, 30);
}
var DOT_POS = { 1: [2, 2], 2: [2, 6], 3: [2, 10], 4: [6, 2], 5: [6, 6], 6: [6, 10], 7: [2, 14], 8: [6, 14] };
function brailleSvg() {
var dots = '';
for (var d = 1; d <= 8; d++) {
dots += '<circle class="braille-dot" data-dot="' + d + '"' + (d === 1 || d === 2 || d === 4 ? ' data-hold' : '') + ' cx="' + DOT_POS[d][0] + '" cy="' + DOT_POS[d][1] + '" r="1.5"/>';
}
return '<svg viewBox="0 0 8 16" aria-hidden="true" focusable="false">' + dots + '</svg>';
}
function defineElements() {
if (typeof customElements === 'undefined' || customElements.get('braille-spinner')) return;
customElements.define('braille-spinner', class extends HTMLElement {
connectedCallback() {
if (!this.firstElementChild) this.innerHTML = brailleSvg();
var label = this.getAttribute('label');
if (label) { this.setAttribute('role', 'status'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
}
});
}
function copyText(text) {
if (navigator.clipboard && navigator.clipboard.writeText) {
return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
}
return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
var active = document.activeElement;
var sel = getSelection();
var ranges = [];
for (var i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i));
var field = null;
try { if (active && active.selectionStart != null) field = [active.selectionStart, active.selectionEnd, active.selectionDirection]; } catch (e) {  }
var area = document.createElement('textarea');
area.value = text;
area.setAttribute('readonly', '');
area.style.cssText = 'position:fixed;top:0;opacity:0';
var ok = false;
try {
document.body.appendChild(area);
area.select();
ok = document.execCommand('copy');
} catch (e) { ok = false; }
area.remove();
sel.removeAllRanges();
ranges.forEach(function (r) { sel.addRange(r); });
if (active && active.focus && document.contains(active)) active.focus({ preventScroll: true });
try { if (field) active.setSelectionRange(field[0], field[1], field[2]); } catch (e) {  }
return ok;
}
function wireCopy() {
document.querySelectorAll('[data-copy], [data-copy-text]').forEach(function (button) {
if (button.__bh) return;
button.__bh = true;
var rest = [button.innerHTML, button.getAttribute('aria-label')];
var iconOnly = button.hasAttribute('data-icon-only');
button.addEventListener('click', function () {
var target = button.dataset.copy ? document.querySelector(button.dataset.copy) : null;
var text = button.dataset.copyText != null ? button.dataset.copyText : (target ? target.textContent : '');
copyText(text).then(function (ok) {
button.innerHTML = icon(ok ? 'Check' : 'X') + (iconOnly ? '' : '<span>' + (ok ? 'Copied' : 'Copy failed') + '</span>');
if (iconOnly) button.setAttribute('aria-label', ok ? 'Copied' : 'Copy failed');
announce(ok ? 'Copied to clipboard' : 'Could not copy');
clearTimeout(button.__bhTimer);
button.__bhTimer = setTimeout(function () {
button.innerHTML = rest[0];
if (iconOnly) { if (rest[1] == null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', rest[1]); }
}, 1600);
});
});
});
}
function wireDisclosure() {
document.querySelectorAll('button[data-disclosure]').forEach(function (button) {
if (button.__bh) return;
button.__bh = true;
var panel = document.getElementById(button.getAttribute('aria-controls'));
if (!panel) return;
var open = button.getAttribute('aria-expanded') === 'true';
button.setAttribute('aria-expanded', String(open));
panel.hidden = !open;
button.addEventListener('click', function () {
var next = button.getAttribute('aria-expanded') !== 'true';
button.setAttribute('aria-expanded', String(next));
panel.hidden = !next;
});
});
}
function wireTabs() {
document.querySelectorAll('[data-tabs]').forEach(function (root) {
if (root.__bh) return;
root.__bh = true;
var list = root.querySelector('[role="tablist"]');
if (!list) return;
var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
var panelOf = function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); };
var select = function (tab, focus) {
tabs.forEach(function (t) {
var on = t === tab;
t.setAttribute('aria-selected', String(on));
t.tabIndex = on ? 0 : -1;
var panel = panelOf(t);
if (panel) { panel.hidden = !on; panel.tabIndex = 0; panel.setAttribute('role', 'tabpanel'); }
});
if (focus) tab.focus();
};
tabs.forEach(function (tab) {
tab.type = 'button';
tab.addEventListener('click', function () { select(tab, false); });
tab.addEventListener('keydown', function (e) {
var i = tabs.indexOf(tab);
var rtl = getComputedStyle(list).direction === 'rtl';
var next = { ArrowRight: rtl ? i - 1 : i + 1, ArrowLeft: rtl ? i + 1 : i - 1, Home: 0, End: tabs.length - 1 }[e.key];
if (next == null) return;
e.preventDefault();
select(tabs[(next + tabs.length) % tabs.length], true);
});
});
select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
});
}
var activePalette = null;
var paletteSeq = 0;
function safeHref(href) {
try { return /^(https?|mailto):$/.test(new URL(String(href), 'https://basalt.invalid/').protocol); } catch (e) { return false; }
}
function composing(e) { return !!e.isComposing || e.keyCode === 229; }
var badKeys = {};
function binding(item) {
var keys = item.keys;
if (!keys) return null;
var mods = keys.filter(function (k) { return k === '⌘' || k === '⌃' || k === '⌥' || k === '⇧'; });
var rest = keys.filter(function (k) { return mods.indexOf(k) === -1; });
if (rest.length !== 1 || !mods.some(function (k) { return k !== '⇧'; })) {
var id = item.label + keys.join(' ');
if (!badKeys[id]) { badKeys[id] = 1; console.warn('Basalt: "' + item.label + '" has keys [' + keys.join(' ') + '] that cannot be bound; a shortcut needs ⌘, ⌃ or ⌥ and one more key'); }
return null;
}
var b = { cmd: mods.indexOf('⌘') !== -1, ctrl: mods.indexOf('⌃') !== -1, alt: mods.indexOf('⌥') !== -1, shift: mods.indexOf('⇧') !== -1, key: String(KEY_NAME[rest[0]] || rest[0]).toLowerCase() };
if ((b.cmd || b.ctrl) && !b.alt && !b.shift && b.key === 'k') {
var reserved = item.label + keys.join(' ');
if (!badKeys[reserved]) { badKeys[reserved] = 1; console.warn('Basalt: "' + item.label + '" has keys [' + keys.join(' ') + '], which open the palette; choose another shortcut'); }
return null;
}
return b;
}
function inField(el) { return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable); }
function typingIn(e) {
var path = e.composedPath ? e.composedPath() : [];
if (!path.length) path = [e.target];
return path.some(inField);
}
function pressed(b, e) {
if (b.alt !== e.altKey || b.shift !== e.shiftKey) return false;
var mods = b.ctrl ? e.ctrlKey && b.cmd === e.metaKey : b.cmd ? e.metaKey !== e.ctrlKey : !e.metaKey && !e.ctrlKey;
return mods && (String(e.key).toLowerCase() === b.key || (b.key.length === 1 && /^[a-z]$/.test(b.key) && e.code === 'Key' + b.key.toUpperCase()));
}
function activate(item, o) {
if (item.onSelect) item.onSelect(item);
if (o.onSelect) o.onSelect(item);
if (item.href) {
if (safeHref(item.href)) location.href = item.href;
else console.warn('Basalt: a palette link must be relative, http, https or mailto');
}
}
function matches(item, query) {
if (!query) return true;
var hay = (item.label + ' ' + (item.keywords || []).join(' ') + ' ' + (item.hint || '')).toLowerCase();
return query.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return hay.indexOf(t) !== -1; });
}
function openPalette(options) {
var o = options || {};
var groups = o.groups || [];
if (activePalette) activePalette.close();
var id = 'bh-palette-' + (++paletteSeq);
var label = o.label || 'Command palette';
var opener = document.activeElement;
var scrim = document.createElement('div');
scrim.className = 'scrim palette-scrim';
scrim.innerHTML =
'<div class="panel float modal palette" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' +
'<div class="input-row">' + icon('MagnifyingGlass') +
'<input type="text" role="combobox" aria-expanded="true" aria-controls="' + id + '-list" aria-autocomplete="list" aria-label="' + esc(label) +
'" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(o.placeholder || 'Type a command or search') + '">' +
'</div>' +
'<div class="rows palette-list" id="' + id + '-list" role="listbox" aria-label="Results"></div>' +
'<div class="palette-empty" hidden>No commands match.</div>' +
'<div class="visually-hidden" role="status"></div>' +
'<div hidden id="' + id + '-keys"></div>' +
'<div class="divider" data-kbd-hint></div>' +
'<div class="palette-footer" id="' + id + '-hints" data-kbd-hint>' +
'<span>' + kbdGroup(['↑', '↓']) + 'Navigate</span><span>' + kbdGroup(['↵']) + 'Run</span><span>' + kbdGroup(['Esc']) + 'Close</span>' +
'</div>' +
'</div>';
var dialog = scrim.firstElementChild;
var input = dialog.querySelector('input');
var list = dialog.querySelector('[role="listbox"]');
var empty = dialog.querySelector('.palette-empty');
var status = dialog.querySelector('[role="status"]');
var words = dialog.querySelector('#' + id + '-keys');
var flat = [];
var index = 0;
var spoken = '';
var timer;
function speak(msg) {
clearTimeout(timer);
if (msg === spoken) return;
timer = setTimeout(function () { status.textContent = spoken = msg; }, 400);
}
function syncHints() {
if (!matchMedia('(hover: none) and (pointer: coarse)').matches || hardwareKeyboard()) input.setAttribute('aria-describedby', id + '-hints');
else input.removeAttribute('aria-describedby');
}
function render() {
var q = input.value.trim();
flat = [];
var html = '';
var described = '';
groups.forEach(function (g, gi) {
var items = (g.items || []).filter(function (it) { return matches(it, q); });
if (!items.length) return;
var gid = id + '-g' + gi;
html += '<div role="group"' + (g.label ? ' aria-labelledby="' + gid + '"' : '') + '>';
if (g.label) html += '<div class="row-group" id="' + gid + '">' + esc(g.label) + '</div>';
items.forEach(function (it) {
var n = flat.length;
flat.push(it);
var keys = binding(it) ? it.keys : null;
if (keys) described += '<span id="' + id + '-o' + n + '-keys">' + esc(keywords(keys)) + '</span>';
html += '<div class="row" role="option" id="' + id + '-o' + n + '" data-index="' + n + '" aria-selected="false"' + (it.danger ? ' data-danger' : '') +
(keys ? ' aria-keyshortcuts="' + esc(keyshortcuts(keys)) + '" aria-describedby="' + id + '-o' + n + '-keys"' : '') + '>' +
(it.icon ? icon(it.icon) : '') + '<span class="row-label">' + esc(it.label) + '</span>' +
(it.hint ? '<span class="row-hint">' + esc(it.hint) + '</span>' : '') + (keys ? kbdGroup(keys) : '') + '</div>';
});
html += '</div>';
});
list.innerHTML = html;
words.innerHTML = described;
list.hidden = flat.length === 0;
empty.hidden = flat.length !== 0;
index = Math.min(index, Math.max(flat.length - 1, 0));
setActive(flat.length ? index : -1, false);
speak(flat.length ? flat.length + (flat.length === 1 ? ' result' : ' results') : 'No commands match.');
}
function setActive(i, scroll) {
var rows = list.querySelectorAll('[role="option"]');
rows.forEach(function (r) { r.setAttribute('aria-selected', 'false'); r.removeAttribute('data-active'); });
if (i < 0 || !rows[i]) { input.removeAttribute('aria-activedescendant'); return; }
index = i;
rows[i].setAttribute('aria-selected', 'true');
rows[i].setAttribute('data-active', '');
input.setAttribute('aria-activedescendant', rows[i].id);
if (scroll !== false) rows[i].scrollIntoView({ block: 'nearest' });
}
function choose(i) {
var item = flat[i];
if (!item) return;
close();
activate(item, o);
}
var inerted = [];
function undo() {
clearTimeout(timer);
document.removeEventListener('keydown', onKey, true);
scrim.remove();
inerted.forEach(function (pair) { if (!pair[1]) pair[0].removeAttribute('inert'); });
inerted = [];
document.documentElement.style.removeProperty('overflow');
}
function close() {
if (activePalette !== api) return;
activePalette = null;
undo();
if (opener && opener.focus && document.contains(opener)) opener.focus();
if (o.onClose) o.onClose();
}
function onKey(e) {
if (!scrim.isConnected) return;
syncHints();
if (composing(e)) return; // finishing or cancelling a composition is not a command
if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) setActive((index + 1) % flat.length); return; }
if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) setActive((index - 1 + flat.length) % flat.length); return; }
if (e.key === 'Enter') {
if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
e.preventDefault();
if (flat.length) choose(index);
return;
}
if (e.key === 'Tab') { e.preventDefault(); input.focus(); } // the input is the dialog's only tab stop
}
list.addEventListener('pointermove', function (e) {
var row = e.target.closest('[role="option"]');
if (row && Number(row.dataset.index) !== index) setActive(Number(row.dataset.index), false);
});
list.addEventListener('click', function (e) {
var row = e.target.closest('[role="option"]');
if (row) choose(Number(row.dataset.index));
});
scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim) close(); });
input.addEventListener('input', function () { index = 0; render(); });
var api = { close: close, element: dialog };
render();
syncHints();
try {
Array.prototype.forEach.call(document.body.children, function (el) {
if (el.tagName === 'SCRIPT' || el.id === 'basalt-live') return;
inerted.push([el, el.hasAttribute('inert')]);
el.setAttribute('inert', '');
});
document.body.appendChild(scrim);
document.documentElement.style.overflow = 'hidden';
document.addEventListener('keydown', onKey, true);
activePalette = api;
input.focus();
} catch (e) {
if (activePalette === api) activePalette = null;
undo();
throw e;
}
return api;
}
function closePalette() { if (activePalette) activePalette.close(); }
function bindPaletteShortcut(options) {
var handler = function (e) {
if (e.defaultPrevented || composing(e) || !(e.metaKey || e.ctrlKey || e.altKey)) return;
if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 'k') {
e.preventDefault();
if (activePalette) activePalette.close();
else openPalette(typeof options === 'function' ? options() : options);
return;
}
var o = typeof options === 'function' ? options() : options;
var typing = !(e.metaKey || e.ctrlKey) && typingIn(e);
(o.groups || []).some(function (g) {
return (g.items || []).some(function (it) {
var b = binding(it);
if (!b || typing || !pressed(b, e)) return false;
e.preventDefault();
if (activePalette) activePalette.close();
activate(it, o);
return true;
});
});
};
document.addEventListener('keydown', handler);
return function () { document.removeEventListener('keydown', handler); };
}
function wirePalette(options) {
if (!options) {
var data = document.querySelector('script[type="application/json"][data-palette]');
if (data) options = JSON.parse(data.textContent);
}
if (!options || document.documentElement.__bhPalette) return;
document.documentElement.__bhPalette = true;
document.querySelectorAll('[data-open-palette]').forEach(function (button) {
button.addEventListener('click', function () { openPalette(typeof options === 'function' ? options() : options); });
if (!button.hasAttribute('aria-keyshortcuts')) button.setAttribute('aria-keyshortcuts', 'Meta+K Control+K');
button.setAttribute('aria-haspopup', 'dialog');
});
bindPaletteShortcut(options);
}
function wirePrint() {
if (document.documentElement.__bhPrint) return;
document.documentElement.__bhPrint = true;
var before = null;
window.addEventListener('beforeprint', function () {
if (before !== null) return;
before = getTheme();
if (before !== 'light') setTheme('light', false);
});
window.addEventListener('afterprint', function () { if (before) setTheme(before, false); before = null; });
}
function init(options) {
var o = options || {};
var run = function () {
[initTheme, initKeyboard, defineElements, hydrateIcons, hydrateKbd, wireThemeToggles, wireCopy, wireDisclosure, wireTabs, wirePrint, function () { wirePalette(o.palette); }].forEach(function (step) {
try { step(); } catch (e) { console.warn('Basalt: ' + (step.name || 'a step') + ' failed: ' + (e && e.message)); }
});
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
else run();
}
window.Basalt = {
init: init, icon: icon, hydrateIcons: hydrateIcons, announce: announce,
getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
kbdGroup: kbdGroup, hardwareKeyboard: hardwareKeyboard,
openPalette: openPalette, closePalette: closePalette,
copyText: copyText
};
})();
