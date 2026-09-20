package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH006UndoPurchasedScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_006",
        title = "Undo Purchased",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_005,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Item status changed","The purchase state is reversible until the list changes.")
            MFListItem("Chicken breast","Shopping list item","Purchased")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH006UndoPurchasedScreenPreview() {
    MoveFuelTheme { FSH006UndoPurchasedScreen {} }
}
