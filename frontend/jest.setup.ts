import '@testing-library/jest-dom';
// jsdom has no fetch/Request/Response; RTK Query needs them.
import 'whatwg-fetch';
