package com.movefuel.mufil2.ui.design

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween

object MoveFuelMotion {
    const val Tap = 110
    const val Small = 170
    const val Card = 230
    const val Screen = 310
    const val Success = 480
    const val DataReveal = 650

    val Emphasized = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val Enter = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f)

    fun <T> enter(): FiniteAnimationSpec<T> = tween(Screen, easing = Enter)
    fun <T> card(): FiniteAnimationSpec<T> = tween(Card, easing = Emphasized)
    fun <T> data(): FiniteAnimationSpec<T> = tween(DataReveal, easing = Emphasized)
    fun <T> softSpring(): FiniteAnimationSpec<T> = spring()
}
