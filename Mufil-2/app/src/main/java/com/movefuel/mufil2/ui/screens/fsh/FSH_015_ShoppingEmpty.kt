package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH015ShoppingEmptyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_015",
        title = "Shopping Empty",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_016,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_014,
        onNavigate = onNavigate,
    ) {
            MFNotice("Shopping Empty","Cached shopping data remains visible when possible and pending changes are shown explicitly.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH015ShoppingEmptyScreenPreview() {
    MoveFuelTheme { FSH015ShoppingEmptyScreen {} }
}
