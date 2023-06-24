// C:/src/_pico8/deno-pico8/test/samples/test_main_file.ts
var SimpleEnum;
(function (SimpleEnum) {
    SimpleEnum[SimpleEnum["One"] = 0] = "One";
    SimpleEnum[SimpleEnum["Two"] = 1] = "Two";
})(SimpleEnum || (SimpleEnum = {}));
var SimpleClass = /** @class */ (function () {
    function SimpleClass() {
        this.myVar = alwaysTrue();
    }
    return SimpleClass;
}());
var simpleClass = new SimpleClass();
// C:/src/_pico8/deno-pico8/test/samples/test_module.ts
var alwaysTrue = function () { return true; };
var mod = {
    alwaysTrue: alwaysTrue
};
