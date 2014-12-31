'use strict';

describe('Directive: dateSlider', function () {

  // load the directive's module
  beforeEach(module('payvizApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<date-slider></date-slider>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the dateSlider directive');
  }));
});
