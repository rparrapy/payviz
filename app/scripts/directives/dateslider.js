'use strict';

/**
 * @ngdoc directive
 * @name payvizApp.directive:dateSlider
 * @description
 * # dateSlider
 */
angular.module('payvizApp')
  .directive('dateSlider', function () {
    return {
      restrict: 'E',
      replace: false,
      scope: { until: '=' },
      template: '<input id="fecha"></input>',
      link: function postLink(scope, element, attrs) {

        $('#fecha').ionRangeSlider({
          min: +moment('20071130', 'YYYYMMDD').format('X'),
          max: +moment('20141231', 'YYYYMMDD').format('X'),
          from: +moment('20141231', 'YYYYMMDD').format('X'),
//          grid: true,
          prettify: function (num) {
              return moment(num, 'X').format('LL');
          },
          onChange: function(data) {
            scope.$apply(function(){ 
              scope.until = moment(data.from, 'X');
            });
          }
        });
      }
    };
  });
