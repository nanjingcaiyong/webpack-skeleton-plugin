module.exports = `
.skl {
  position: relative;
  display: inline-block;
}

.skl::after {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: '#fff';
  content: ' ';
}

.skl::before {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(190, 190, 190, 0.2) 25%, rgba(129, 129, 129, 0.24) 37%, rgba(190, 190, 190, 0.2) 100%);
  background-size: 400% 100%;
  background-color: #fff;
  animation: ant-skeleton-loading 1.4s ease infinite;
  content: ' ';
}

@keyframes ant-skeleton-loading {
  0% { background-position: 100% 50%; }
  to { background-position: 0 50%; }
}
`;